// ITM-Data-API/src/menu/menu.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { RefMenu, Prisma } from '@prisma/client';

export interface MenuNode {
  menuId: number;
  label: string;
  routerPath: string | null;
  icon: string | null;
  parentId: number | null;
  sortOrder: number | null;
  children: MenuNode[];
  statusTag?: string | null;
  isVisible?: boolean;
  roles?: string[];
}

export interface CreateMenuDto {
  label: string;
  routerPath?: string;
  parentId?: number | null;
  icon?: string;
  sortOrder?: number;
  statusTag?: string;
  isVisible?: boolean;
  roles?: string[];
}

export interface UpdateMenuDto {
  label?: string;
  routerPath?: string;
  parentId?: number | null;
  icon?: string;
  sortOrder?: number;
  statusTag?: string;
  isVisible?: boolean;
  roles?: string[];
}

@Injectable()
export class MenuService {
  constructor(private prisma: PrismaService) {}

  // [핵심] 사용자용 메뉴 트리 조회 (권한 기반 필터링)
  async getMyMenus(role: string): Promise<MenuNode[]> {
    // 1. 활성화된(isVisible='Y') 전체 메뉴 조회
    const allMenus = await this.prisma.refMenu.findMany({
      where: { isVisible: 'Y' },
      orderBy: { sortOrder: 'asc' },
    });

    // 2. 관리자(ADMIN)이거나 데모 모드일 경우 전체 메뉴 반환
    if (process.env.ENABLE_DEMO_MODE === 'true' || role === 'ADMIN') {
      return this.buildMenuTree(allMenus);
    }

    // 3. 해당 Role이 접근 가능한 메뉴 ID 목록 조회
    const accessible = await this.prisma.cfgMenuRole.findMany({
      where: { role: role },
      select: { menuId: true },
    });
    const allowedIds = new Set(accessible.map((a) => a.menuId));

    // 4. 재귀적 필터링 (자식 메뉴 권한이 있으면 부모 메뉴도 자동 포함)
    const validMenus = this.filterMenusRecursive(allMenus, allowedIds);

    return this.buildMenuTree(validMenus);
  }

  // [관리자용] 전체 메뉴 및 권한 매핑 조회
  async getAllMenus(): Promise<MenuNode[]> {
    const menus = await this.prisma.refMenu.findMany({
      orderBy: { sortOrder: 'asc' },
    });

    // 모든 권한 매핑 정보 조회
    const roleMappings = await this.prisma.cfgMenuRole.findMany();
    
    // 메뉴 ID별 권한 목록 Map 생성
    const roleMap = new Map<number, string[]>();
    roleMappings.forEach(mapping => {
      if (!roleMap.has(mapping.menuId)) {
        roleMap.set(mapping.menuId, []);
      }
      roleMap.get(mapping.menuId)?.push(mapping.role);
    });

    return this.buildMenuTree(menus, roleMap);
  }

  // --- CRUD Operations ---

  async createMenu(data: CreateMenuDto) {
    const { label, routerPath, parentId, icon, sortOrder, statusTag, roles, isVisible } = data;

    // Prisma Transaction 불필요 (Create는 단일) -> Role 매핑은 별도 처리
    const newMenu = await this.prisma.refMenu.create({
      data: {
        label,
        routerPath: routerPath || null,
        parentId: parentId || null,
        icon: icon || null,
        sortOrder: sortOrder || 0,
        statusTag: statusTag || null,
        isVisible: isVisible === false ? 'N' : 'Y', // boolean -> 'Y'/'N' 변환
      },
    });

    // 권한 매핑 추가
    if (roles && roles.length > 0) {
      await this.prisma.cfgMenuRole.createMany({
        data: roles.map((role) => ({
          menuId: newMenu.menuId,
          role,
        })),
      });
    }
    return newMenu;
  }

  async updateMenu(id: number, data: UpdateMenuDto) {
    const { label, routerPath, parentId, icon, sortOrder, statusTag, roles, isVisible } = data;

    const updateData: Prisma.RefMenuUpdateInput = {
      ...(label !== undefined && { label }),
      ...(routerPath !== undefined && { routerPath: routerPath || null }),
      ...(parentId !== undefined && { parentId }),
      ...(icon !== undefined && { icon: icon || null }),
      ...(sortOrder !== undefined && { sortOrder }),
      ...(statusTag !== undefined && { statusTag: statusTag || null }),
      ...(isVisible !== undefined && { isVisible: isVisible ? 'Y' : 'N' }),
    };

    // 메뉴 업데이트
    const updatedMenu = await this.prisma.refMenu.update({
      where: { menuId: id },
      data: updateData,
    });

    // 권한 정보가 전달된 경우에만 매핑 업데이트 (기존 권한 삭제 후 재생성)
    if (roles && Array.isArray(roles)) {
      await this.prisma.$transaction(async (tx) => {
        await tx.cfgMenuRole.deleteMany({ where: { menuId: id } });
        if (roles.length > 0) {
          await tx.cfgMenuRole.createMany({
            data: roles.map((role) => ({
              menuId: id,
              role,
            })),
          });
        }
      });
    }
    return updatedMenu;
  }

  async deleteMenu(id: number) {
    // 권한 매핑 먼저 삭제 후 메뉴 삭제 (FK 제약 조건 고려)
    await this.prisma.cfgMenuRole.deleteMany({ where: { menuId: id } });
    return this.prisma.refMenu.delete({ where: { menuId: id } });
  }

  // 특정 Role에 대한 권한 일괄 업데이트
  async updateRolePermissions(role: string, menuIds: number[]): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.cfgMenuRole.deleteMany({ where: { role } });
      if (menuIds.length > 0) {
        await tx.cfgMenuRole.createMany({
          data: menuIds.map((menuId) => ({ role, menuId })),
        });
      }
    });
  }

  async getAllRolePermissions() {
    return this.prisma.cfgMenuRole.findMany();
  }

  // --- Helper Methods ---

  // 권한 있는 메뉴 및 그 부모 메뉴들을 재귀적으로 필터링
  private filterMenusRecursive(allMenus: RefMenu[], allowedIds: Set<number>): RefMenu[] {
    const menuMap = new Map<number, RefMenu>(allMenus.map(m => [m.menuId, m]));
    const resultIds = new Set<number>();

    // 1. 권한이 있는 메뉴 ID 추가
    allowedIds.forEach(id => resultIds.add(id));

    // 2. 권한 있는 메뉴의 상위(부모) 메뉴들을 찾아 결과에 추가
    allowedIds.forEach(id => {
      let current = menuMap.get(id);
      while (current && current.parentId) {
        const parent = menuMap.get(current.parentId);
        if (parent) {
          resultIds.add(parent.menuId);
          current = parent;
        } else {
          break;
        }
      }
    });

    // 3. 결과 ID 집합에 포함된 메뉴만 반환
    return allMenus.filter(m => resultIds.has(m.menuId));
  }

  // Flat List -> Tree Structure 변환
  private buildMenuTree(menus: RefMenu[], roleMap?: Map<number, string[]>): MenuNode[] {
    const map = new Map<number, MenuNode>();
    const roots: MenuNode[] = [];

    // 노드 생성
    menus.forEach((menu) => {
      map.set(menu.menuId, {
        menuId: menu.menuId,
        label: menu.label,
        routerPath: menu.routerPath,
        icon: menu.icon,
        parentId: menu.parentId,
        sortOrder: menu.sortOrder,
        statusTag: menu.statusTag,
        isVisible: menu.isVisible === 'Y',
        children: [],
        roles: roleMap ? (roleMap.get(menu.menuId) || []) : undefined,
      });
    });

    // 트리 연결
    menus.forEach((menu) => {
      if (menu.parentId && map.has(menu.parentId)) {
        const parent = map.get(menu.parentId);
        parent?.children.push(map.get(menu.menuId)!);
      } else {
        roots.push(map.get(menu.menuId)!);
      }
    });

    // 정렬 (sortOrder 기준)
    const sortNodes = (nodes: MenuNode[]) => {
      nodes.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
      nodes.forEach(node => {
        if (node.children.length > 0) sortNodes(node.children);
      });
    };
    sortNodes(roots);

    return roots;
  }
}

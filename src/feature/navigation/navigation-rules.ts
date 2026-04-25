export type Dong = 'A' | 'B' | 'C' | 'D' | 'T';

export type ParsedUnit = {
  dong: Dong;
  floor: number;
  unit: number;
  label: string;
};

export type ParseIssue = 'dong' | 'floor' | 'unit' | 'range';

export type ParseResult =
  | {
      ok: true;
      unit: ParsedUnit;
    }
  | {
      ok: false;
      issue: ParseIssue;
      message: string;
    };

export type CoreAccessStatus = 'best' | 'recommended' | 'possible' | 'unavailable';

export type CoreAccess = {
  core: number;
  available: boolean;
  rank: number;
  status: CoreAccessStatus;
  badge: string;
  title: string;
  message: string;
};

export type RoutePlan =
  | {
      ok: true;
      title: string;
      steps: string[];
      start: ParsedUnit;
      target: ParsedUnit;
    }
  | {
      ok: false;
      message: string;
    };

const CORES = [1, 2, 3, 4] as const;
const TRANSFER_FLOORS = [1, 2, 3, 4] as const;
const FLOOR_MIN = 4;
const FLOOR_MAX = 25;

const UNIT_PRIORITY: Record<Dong, (unit: number) => number[]> = {
  T: () => [1, 2, 3, 4],
  A: (unit) => (unit <= 10 ? [2, 1, 3, 4] : [1, 2, 3, 4]),
  B: (unit) => (unit >= 7 && unit <= 23 ? [3, 2, 4, 1] : [2, 3, 4, 1]),
  C: (unit) => (unit >= 6 && unit <= 16 ? [4, 3, 2, 1] : [3, 4, 2, 1]),
  D: () => [4, 3, 2, 1],
};

const isConnectedFloor = (floor: number) => floor >= 8 && floor <= 19;

const toUnitLabel = ({ dong, floor, unit }: Pick<ParsedUnit, 'dong' | 'floor' | 'unit'>) =>
  `${dong}동 ${floor}${unit.toString().padStart(2, '0')}호`;

const isDirectCore = ({ dong, floor, unit }: ParsedUnit, core: number) => {
  if (floor < FLOOR_MIN || floor > FLOOR_MAX) {
    return false;
  }

  if (core === 1) {
    if (dong === 'T') {
      return floor >= 4 && floor <= 25;
    }

    return dong === 'A' && isConnectedFloor(floor);
  }

  if (core === 2) {
    if (isConnectedFloor(floor)) {
      return dong === 'A' || dong === 'B';
    }

    if (floor >= 4 && floor <= 7) {
      return (
        (dong === 'A' && unit >= 1 && unit <= 10) ||
        (dong === 'B' && ((unit >= 1 && unit <= 6) || (unit >= 24 && unit <= 34)))
      );
    }

    if (floor >= 20 && floor <= 25) {
      return (
        (dong === 'A' && unit >= 1 && unit <= 10) ||
        (dong === 'B' && ((unit >= 1 && unit <= 6) || (unit >= 24 && unit <= 30)))
      );
    }
  }

  if (core === 3) {
    if (isConnectedFloor(floor)) {
      return dong === 'B' || dong === 'C';
    }

    if (floor >= 4 && floor <= 7) {
      return (
        (dong === 'B' && unit >= 7 && unit <= 23) ||
        (dong === 'C' && ((unit >= 1 && unit <= 5) || (unit >= 17 && unit <= 24)))
      );
    }

    if (floor >= 20 && floor <= 25) {
      return (
        (dong === 'B' && unit >= 7 && unit <= 23) ||
        (dong === 'C' && unit >= 1 && unit <= 14)
      );
    }
  }

  if (core === 4) {
    if (isConnectedFloor(floor)) {
      return dong === 'C' || dong === 'D';
    }

    if (floor >= 4 && floor <= 7) {
      return (
        (dong === 'C' && unit >= 6 && unit <= 16) ||
        (dong === 'D' && unit >= 1 && unit <= 13)
      );
    }
  }

  return false;
};

const getDirectCores = (unit: ParsedUnit) =>
  CORES.filter((core) => isDirectCore(unit, core)).sort(
    (left, right) =>
      UNIT_PRIORITY[unit.dong](unit.unit).indexOf(left) -
      UNIT_PRIORITY[unit.dong](unit.unit).indexOf(right),
  );

const getPossibleCoreRank = (unit: ParsedUnit, core: number, directCores: number[]) => {
  const priority = UNIT_PRIORITY[unit.dong](unit.unit);
  const nearestDirectDistance = Math.min(...directCores.map((directCore) => Math.abs(directCore - core)));

  return 20 + nearestDirectDistance * 4 + priority.indexOf(core);
};

const getUnavailableMessage = (unit: ParsedUnit, core: number) => {
  if (core === 4 && unit.floor >= 20) {
    return '4번 코어 엘리베이터는 19층까지만 운행합니다.';
  }

  return '이 호수로는 연결되지 않습니다.';
};

const parseRoomNumber = (normalized: string) => {
  const roomWithSuffix = normalized.match(/(\d{3,4})호/);
  const fallbackRoom = normalized.match(/(?:^|[^층\d])(\d{3,4})(?:$|[^\d])/);
  const roomNumber = roomWithSuffix?.[1] ?? fallbackRoom?.[1];

  if (!roomNumber) {
    return null;
  }

  const value = Number(roomNumber);
  const floor = Math.floor(value / 100);
  const unit = value % 100;

  return { floor, unit };
};

export const parseUnitInput = (input: string): ParseResult => {
  const normalized = input.trim().toUpperCase().replace(/\s+/g, '');
  const dongMatch = normalized.match(/([ABCDT])동?/);
  const dong = dongMatch?.[1] as Dong | undefined;
  const parsedRoom = parseRoomNumber(normalized);
  const floorOnly = normalized.match(/(\d{1,2})층/);

  if (!dong) {
    return {
      ok: false,
      issue: 'dong',
      message: '동 정보가 필요합니다.',
    };
  }

  if (!parsedRoom && floorOnly) {
    return {
      ok: false,
      issue: 'unit',
      message: '호수 정보가 더 필요합니다.',
    };
  }

  if (!parsedRoom) {
    return {
      ok: false,
      issue: 'floor',
      message: '층 정보가 필요합니다.',
    };
  }

  if (parsedRoom.unit < 1) {
    return {
      ok: false,
      issue: 'unit',
      message: '호수 정보가 더 필요합니다.',
    };
  }

  if (parsedRoom.floor < FLOOR_MIN || parsedRoom.floor > FLOOR_MAX) {
    return {
      ok: false,
      issue: 'range',
      message: '확인 가능한 층은 4층부터 25층까지입니다.',
    };
  }

  const unit = {
    dong,
    floor: parsedRoom.floor,
    unit: parsedRoom.unit,
    label: toUnitLabel({ dong, floor: parsedRoom.floor, unit: parsedRoom.unit }),
  };

  return { ok: true, unit };
};

export const getCoreAccessList = (unit: ParsedUnit): CoreAccess[] => {
  const directCores = getDirectCores(unit);
  const bestCore = directCores[0];

  return CORES.map((core) => {
    const directRank = directCores.indexOf(core);
    const isDirect = directRank >= 0;
    const isPossible = !isDirect && isConnectedFloor(unit.floor);
    const status: CoreAccessStatus = isDirect
      ? core === bestCore
        ? 'best'
        : 'recommended'
      : isPossible
        ? 'possible'
        : 'unavailable';
    const rank = isDirect ? directRank : isPossible ? getPossibleCoreRank(unit, core, directCores) : 100 + core;

    const messageByStatus: Record<CoreAccessStatus, string> = {
      best: '호수 구간상 가장 가까운 담당 코어입니다.',
      recommended: '목적지에 직접 연결되는 담당 코어입니다.',
      possible: '8~19층 연결 구간을 통해 이동 가능합니다.',
      unavailable: getUnavailableMessage(unit, core),
    };

    const badgeByStatus: Record<CoreAccessStatus, string> = {
      best: '가장 추천',
      recommended: '추천',
      possible: '이동 가능',
      unavailable: '불가',
    };

    return {
      core,
      available: status === 'best' || status === 'recommended' || status === 'possible',
      rank,
      status,
      badge: badgeByStatus[status],
      title: `${core}번 코어`,
      message: messageByStatus[status],
    };
  }).sort((left, right) => {
    if (left.available !== right.available) {
      return left.available ? -1 : 1;
    }

    return left.rank - right.rank;
  });
};

export const getRecommendedCore = (unit: ParsedUnit) =>
  getCoreAccessList(unit).find((access) => access.status === 'best') ?? null;

const getSharedCore = (start: ParsedUnit, target: ParsedUnit) => {
  const startCores = getCoreAccessList(start).filter((access) => access.available);
  const targetCores = getCoreAccessList(target).filter((access) => access.available);
  const sharedCores = startCores
    .map((startCore) => {
      const targetCore = targetCores.find((core) => core.core === startCore.core);

      if (!targetCore) {
        return null;
      }

      return {
        core: startCore.core,
        rank: startCore.rank + targetCore.rank,
        direct: startCore.status !== 'possible' && targetCore.status !== 'possible',
      };
    })
    .filter((core): core is { core: number; rank: number; direct: boolean } => core !== null)
    .sort((left, right) => {
      if (left.direct !== right.direct) {
        return left.direct ? -1 : 1;
      }

      return left.rank - right.rank;
    });

  return sharedCores[0] ?? null;
};

export const buildRoutePlan = (startInput: string, targetInput: string): RoutePlan => {
  const start = parseUnitInput(startInput);
  const target = parseUnitInput(targetInput);

  if (!start.ok) {
    return { ok: false, message: `출발: ${start.message}` };
  }

  if (!target.ok) {
    return { ok: false, message: `도착: ${target.message}` };
  }

  if (
    start.unit.floor === target.unit.floor &&
    (isConnectedFloor(start.unit.floor) || start.unit.floor <= TRANSFER_FLOORS[TRANSFER_FLOORS.length - 1])
  ) {
    return {
      ok: true,
      title: `${start.unit.floor}층에서 바로 이동`,
      start: start.unit,
      target: target.unit,
      steps: [
        `${start.unit.label}에서 같은 층 연결 통로로 이동하세요.`,
        `${target.unit.label} 방향 표기를 따라가세요.`,
      ],
    };
  }

  const sharedCore = getSharedCore(start.unit, target.unit);
  const bestStartCore = getRecommendedCore(start.unit);
  const bestTargetCore = getRecommendedCore(target.unit);

  if (sharedCore) {
    return {
      ok: true,
      title: `${sharedCore.core}번 코어로 이동`,
      start: start.unit,
      target: target.unit,
      steps: [
        `${start.unit.label}에서 ${sharedCore.core}번 코어 엘리베이터로 이동하세요.`,
        `${target.unit.floor}층에서 내려 ${target.unit.label}로 가세요.`,
      ],
    };
  }

  if (!bestStartCore || !bestTargetCore) {
    return {
      ok: false,
      message: '연결 가능한 코어가 없습니다. 확인이 필요합니다.',
    };
  }

  return {
    ok: true,
    title: `1층~4층에서 ${bestTargetCore.core}번 코어로 환승`,
    start: start.unit,
    target: target.unit,
    steps: [
      `${start.unit.label}에서 ${bestStartCore.core}번 코어 엘리베이터를 타고 1층~4층으로 이동하세요.`,
      `1층~3층은 내부 동선으로, 4층은 공원을 통해 ${bestTargetCore.core}번 코어로 환승하세요.`,
      `${target.unit.floor}층에서 내려 ${target.unit.label}로 가세요.`,
    ],
  };
};

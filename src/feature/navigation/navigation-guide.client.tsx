'use client';

import { useMemo, useState } from 'react';
import { FloorPlanViewer } from '@/feature/navigation/floor-plan-viewer.client';
import {
  buildRoutePlan,
  getCoreAccessList,
  getRecommendedCore,
  parseUnitInput,
  type CoreAccess,
  type Dong,
} from '@/feature/navigation/navigation-rules';

type GuideMode = 'single' | 'route';

type UnitFormValue = {
  dong: Dong | '';
  room: string;
};

const DONG_OPTIONS: Dong[] = ['A', 'B', 'C', 'D', 'T'];

const RELATED_LINKS = [
  {
    label: '입주자모임',
    description: '네이버 카페',
    href: 'https://cafe.naver.com/bundangpoonglim',
  },
  {
    label: '주차 등록',
    description: '방문 차량 등록',
    href: 'http://www.poonglimparking.com',
  },
  {
    label: '주차가능 대수',
    description: '세대별 조회',
    href: 'https://www.bundangpoonglim.com/parking/',
  },
];

const EMPTY_UNIT: UnitFormValue = {
  dong: '',
  room: '',
};

const sanitizeNumber = (value: string, maxLength: number) => value.replace(/\D/g, '').slice(0, maxLength);

const isUnitReady = (value: UnitFormValue) => Boolean(value.dong && value.room.length >= 3);

const toInputValue = ({ dong, room }: UnitFormValue) => {
  if (!dong) {
    return `${room}호`;
  }

  return room ? `${dong}동 ${room}호` : `${dong}동`;
};

const getCoreCardStyle = (status: CoreAccess['status']) => {
  if (status === 'best') {
    return {
      item: 'border-[#183f35] bg-[#f7fbf8] text-[#15372f] shadow-sm',
      badge: 'bg-[#183f35] text-white',
      mark: 'bg-[#183f35] text-white',
    };
  }

  if (status === 'recommended') {
    return {
      item: 'border-[#c9d8d2] bg-white text-[#213a34]',
      badge: 'bg-[#e6f0ec] text-[#1f3c34]',
      mark: 'bg-[#e6f0ec] text-[#1f3c34]',
    };
  }

  if (status === 'possible') {
    return {
      item: 'border-[#d7d8cb] bg-[#fffdf5] text-[#56543e]',
      badge: 'bg-[#efe8c9] text-[#5b4f1c]',
      mark: 'bg-[#efe8c9] text-[#5b4f1c]',
    };
  }

  return {
    item: 'border-[#e1e3de] bg-[#f3f3ef] text-[#8a8e86]',
    badge: 'bg-white text-[#8a8e86]',
    mark: 'bg-white text-[#a3a69e]',
  };
};

const CoreCard = ({ access }: { access: CoreAccess }) => {
  const style = getCoreCardStyle(access.status);

  return (
    <li className={['flex min-h-20 items-center justify-between rounded-lg border px-4 py-3', style.item].join(' ')}>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-base font-bold">{access.title}</span>
          <span className={['rounded-full px-2 py-0.5 text-[11px] font-bold', style.badge].join(' ')}>
            {access.badge}
          </span>
        </div>
        <p className="mt-1 text-sm">{access.message}</p>
      </div>
      <span
        className={['flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-black', style.mark].join(
          ' ',
        )}
        aria-hidden="true"
      >
        {access.core}
      </span>
    </li>
  );
};

const ModeButton = ({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: string;
  onClick: () => void;
}) => (
  <button
    className={[
      'h-11 flex-1 rounded-md px-3 text-sm font-bold transition',
      active ? 'bg-[#1f3c34] text-white shadow-sm' : 'text-[#5f665f] hover:bg-white',
    ].join(' ')}
    type="button"
    onClick={onClick}
  >
    {children}
  </button>
);

const DongRadioGroup = ({
  name,
  value,
  onChange,
}: {
  name: string;
  value: Dong | '';
  onChange: (dong: Dong) => void;
}) => (
  <div className="grid grid-cols-2 gap-2 min-[320px]:grid-cols-3 min-[430px]:grid-cols-5">
    {DONG_OPTIONS.map((dong) => (
      <label
        className={[
          'flex h-10 min-w-0 cursor-pointer items-center justify-center rounded-md border px-1 text-xs font-black transition min-[360px]:text-sm min-[430px]:h-11',
          value === dong
            ? 'border-[#1f3c34] bg-[#1f3c34] text-white shadow-sm'
            : 'border-[#d6dcd2] bg-[#f8f9f4] text-[#59625b]',
        ].join(' ')}
        key={dong}
      >
        <input
          className="sr-only"
          name={name}
          type="radio"
          value={dong}
          checked={value === dong}
          onChange={() => onChange(dong)}
        />
        {dong}동
      </label>
    ))}
  </div>
);

const UnitFields = ({
  name,
  title,
  value,
  onChange,
}: {
  name: string;
  title: string;
  value: UnitFormValue;
  onChange: (nextValue: UnitFormValue) => void;
}) => {
  const ready = isUnitReady(value);

  return (
    <fieldset className="grid min-w-0 gap-3">
      <legend className="text-sm font-bold text-[#3a423b]">{title}</legend>
      <DongRadioGroup
        name={`${name}-dong`}
        value={value.dong}
        onChange={(dong) => onChange({ ...value, dong })}
      />
      <label className="block">
        <span className="text-xs font-bold text-[#697269]">호</span>
        <div className="mt-1 flex min-h-14 min-w-0 flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-[#cfd6cc] bg-[#fbfcf8] px-3 py-2 focus-within:border-[#1f3c34] focus-within:bg-white min-[360px]:px-4">
          <input
            className="w-0 min-w-[6ch] flex-1 bg-transparent text-lg font-black outline-none min-[360px]:text-xl"
            inputMode="numeric"
            maxLength={4}
            placeholder="1001"
            autoComplete="off"
            value={value.room}
            onChange={(event) => onChange({ ...value, room: sanitizeNumber(event.target.value, 4) })}
          />
          <span className="shrink-0 text-sm font-bold text-[#8a9289]">호</span>
          {value.room ? (
            <button
              className="ml-auto rounded-md bg-[#e8ece5] px-2 py-1 text-xs font-bold text-[#626a61]"
              type="button"
              onClick={() => onChange({ ...value, room: '' })}
            >
              지우기
            </button>
          ) : null}
        </div>
      </label>
      <p className="break-words rounded-md bg-[#f3f5ef] px-3 py-2 text-sm font-bold text-[#5d665e]">
        {ready ? `입력값: ${toInputValue(value)}` : '동을 선택하고 호수를 입력하세요.'}
      </p>
    </fieldset>
  );
};

const EmptyResult = ({ message }: { message: string }) => (
  <div className="rounded-lg border border-[#d5dbd1] bg-white p-4 shadow-sm">
    <p className="text-sm font-bold text-[#697269]">입력 대기</p>
    <p className="mt-1 text-base font-bold leading-relaxed text-[#343c35]">{message}</p>
  </div>
);

const SupportSection = () => (
  <aside className="mt-6 grid gap-3">
    <section className="rounded-lg border border-[#d9ded6] bg-white p-4 shadow-sm">
      <p className="text-sm font-black text-[#1f3c34]">관리사무소 T동 1층</p>
      <a className="mt-1 block text-2xl font-black tracking-tight text-[#111713]" href="tel:0317061600">
        031-706-1600
      </a>
      <p className="mt-2 text-sm font-medium leading-relaxed text-[#667067]">
        관리사무소 업무시간은 월~금 오후 6시까지, 토요일은 정오 12시까지입니다.
      </p>
    </section>

    <section className="grid gap-2">
      {RELATED_LINKS.map((link) => (
        <a
          className="flex min-w-0 items-center justify-between gap-3 rounded-lg border border-[#d9ded6] bg-white px-4 py-3 text-[#1b211d] shadow-sm"
          href={link.href}
          key={link.href}
          rel="noreferrer"
          target="_blank"
        >
          <span className="min-w-0">
            <span className="block text-sm font-black">{link.label}</span>
            <span className="mt-0.5 block text-xs font-bold text-[#737b72]">{link.description}</span>
          </span>
          <span className="text-lg font-black text-[#667067]" aria-hidden="true">
            ›
          </span>
        </a>
      ))}
    </section>
  </aside>
);

export function NavigationGuideClient() {
  const [mode, setMode] = useState<GuideMode>('single');
  const [showFloorPlan, setShowFloorPlan] = useState(false);
  const [singleUnit, setSingleUnit] = useState<UnitFormValue>(EMPTY_UNIT);
  const [startUnit, setStartUnit] = useState<UnitFormValue>(EMPTY_UNIT);
  const [targetUnit, setTargetUnit] = useState<UnitFormValue>(EMPTY_UNIT);
  const [swapCount, setSwapCount] = useState(0);
  const singleReady = isUnitReady(singleUnit);
  const routeReady = isUnitReady(startUnit) && isUnitReady(targetUnit);
  const singleInput = useMemo(() => toInputValue(singleUnit), [singleUnit]);
  const startInput = useMemo(() => toInputValue(startUnit), [startUnit]);
  const targetInput = useMemo(() => toInputValue(targetUnit), [targetUnit]);
  const parsedUnit = useMemo(() => (singleReady ? parseUnitInput(singleInput) : null), [singleInput, singleReady]);
  const accessList = useMemo(
    () => (parsedUnit?.ok ? getCoreAccessList(parsedUnit.unit) : []),
    [parsedUnit],
  );
  const recommendedCore = useMemo(
    () => (parsedUnit?.ok ? getRecommendedCore(parsedUnit.unit) : null),
    [parsedUnit],
  );
  const routePlan = useMemo(
    () => (routeReady ? buildRoutePlan(startInput, targetInput) : null),
    [routeReady, startInput, targetInput],
  );

  return (
    <main className="min-h-dvh overflow-x-hidden bg-[linear-gradient(180deg,#fbfbf7_0%,#f7f7f2_48%,#edf3ef_100%)] text-[#171b18]">
      <div className="mx-auto flex min-h-dvh w-full max-w-3xl min-w-0 flex-col px-4 pb-6 pt-5 sm:px-6 sm:py-8">
        <header className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#657067]">IWANT NAVI</p>
          <h1 className="mt-2 max-w-full text-xl font-black leading-tight text-[#111713] min-[360px]:text-[22px] sm:text-3xl">
            <span className="block">분당풍림아이원플러스 방문자 길안내</span>
          </h1>
          <p className="mt-3 text-sm font-medium leading-relaxed text-[#667067]">
            1층~4층 출발 기준, 1~4코어 엘리베이터 중 목적지까지 적합한 코어를 안내합니다.
          </p>
        </header>

        <div className="mt-6 flex items-center gap-2">
          <section className="flex-1 rounded-lg border border-[#d8ddd4] bg-[#eef4ed] p-1">
            <div className="flex gap-1">
              <ModeButton active={mode === 'single'} onClick={() => setMode('single')}>
                코어 찾기
              </ModeButton>
              <ModeButton active={mode === 'route'} onClick={() => setMode('route')}>
                세대간 이동
              </ModeButton>
            </div>
          </section>
          <button
            className="flex shrink-0 flex-col items-center gap-1 rounded-lg border border-[#d8ddd4] bg-[#eef4ed] px-3 py-2 transition hover:bg-[#e4ede2] active:scale-95"
            type="button"
            title="오피스텔 도면 보기"
            aria-label="오피스텔 도면 보기"
            onClick={() => setShowFloorPlan(true)}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-[#1f3c34]" aria-hidden="true">
              <path d="M3 9l9-6 9 6v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            <span className="text-[10px] font-black leading-none text-[#3a5249]">도면</span>
          </button>
        </div>

        {mode === 'single' ? (
          <section className="mt-4 flex flex-1 flex-col gap-4">
            <div className="rounded-lg border border-[#dadfd6] bg-white p-4 shadow-sm">
              <UnitFields
                name="single"
                title="방문할 동 / 호수"
                value={singleUnit}
                onChange={setSingleUnit}
              />
            </div>

            {!parsedUnit ? <EmptyResult message="방문할 동과 호수를 입력하세요." /> : null}

            {parsedUnit && !parsedUnit.ok ? (
              <div className="rounded-lg border border-[#d5dbd1] bg-white p-4 shadow-sm">
                <p className="text-sm font-bold text-[#9b5932]">입력 확인</p>
                <h2 className="mt-1 break-words text-2xl font-black leading-tight">{parsedUnit.message}</h2>
              </div>
            ) : null}

            {parsedUnit?.ok ? (
              <>
                <div className="rounded-lg border border-[#d5dbd1] bg-white p-4 shadow-sm">
                  <p className="text-sm font-bold text-[#697269]">{parsedUnit.unit.label}</p>
                  <h2 className="mt-1 break-words text-2xl font-black leading-tight">
                    {recommendedCore ? `${recommendedCore.core}코어가 가장 좋습니다` : '확인이 필요합니다'}
                  </h2>
                  <p className="mt-2 text-sm font-medium text-[#5b655d]">
                    안내판 기준으로 빠른 순서와 가능 여부를 함께 표시합니다.
                  </p>
                </div>
                <ol className="grid gap-2">
                  {accessList.map((access) => (
                    <CoreCard access={access} key={access.core} />
                  ))}
                </ol>
              </>
            ) : null}
          </section>
        ) : (
          <section className="mt-4 flex flex-1 flex-col gap-4">
            <div className="grid gap-3 rounded-lg border border-[#dadfd6] bg-white p-4 shadow-sm">
              <UnitFields name="start" title="출발" value={startUnit} onChange={setStartUnit} />
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-[#e5e8e1]" />
                <button
                  className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-[#cfd6cc] bg-[#f8f9f4] text-xl font-black text-[#1f3c34] shadow-sm transition-transform duration-300 active:scale-95"
                  type="button"
                  aria-label="출발과 도착을 바꿉니다"
                  title="출발과 도착 바꾸기"
                  style={{ transform: `rotate(${swapCount * 180}deg)` }}
                  onClick={() => {
                    setSwapCount((previous) => previous + 1);
                    setStartUnit(targetUnit);
                    setTargetUnit(startUnit);
                  }}
                >
                  ↕
                </button>
                <div className="h-px flex-1 bg-[#e5e8e1]" />
              </div>
              <UnitFields name="target" title="도착" value={targetUnit} onChange={setTargetUnit} />
            </div>

            {!routePlan ? <EmptyResult message="출발지와 도착지를 모두 입력하세요." /> : null}

            {routePlan && !routePlan.ok ? (
              <div className="rounded-lg border border-[#d5dbd1] bg-white p-4 shadow-sm">
                <p className="text-sm font-bold text-[#9b5932]">입력 확인</p>
                <h2 className="mt-1 break-words text-2xl font-black leading-tight">{routePlan.message}</h2>
              </div>
            ) : null}

            {routePlan?.ok ? (
              <div className="rounded-lg border border-[#d5dbd1] bg-white p-4 shadow-sm">
                <p className="text-sm font-bold text-[#697269]">
                  {routePlan.start.label} → {routePlan.target.label}
                </p>
                <h2 className="mt-1 break-words text-2xl font-black leading-tight">{routePlan.title}</h2>
                <ol className="mt-4 grid gap-3">
                  {routePlan.steps.map((step, index) => (
                    <li className="flex gap-3" key={step}>
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#1f3c34] text-sm font-black text-white">
                        {index + 1}
                      </span>
                      <p className="min-w-0 break-words pt-0.5 text-base font-bold leading-relaxed text-[#343c35]">{step}</p>
                    </li>
                  ))}
                </ol>
              </div>
            ) : null}
          </section>
        )}

        <SupportSection />
      </div>

      {showFloorPlan ? <FloorPlanViewer onClose={() => setShowFloorPlan(false)} /> : null}
    </main>
  );
}

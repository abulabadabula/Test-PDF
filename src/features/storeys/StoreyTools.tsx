// src/features/storeys/StoreyTools.tsx
//
// Tools that work across storeys: copy members from another storey, check that
// columns and walls are carried by nodes of the storey below, and export.

import { useState } from 'react';
import { toast } from 'sonner';
import {
  Anchor,
  CheckCircle2,
  Copy,
  Download,
  Link2,
  Magnet,
  ShieldCheck,
  TriangleAlert,
} from 'lucide-react';

import { store } from '@/app/store';
import { useAppDispatch, useAppSelector } from '@/app/store/hooks';
import {
  effectiveSheetId,
  selectStoreys,
} from '@/app/store/slices/storeySlice';
import {
  setGhostSnap,
  setLinkToleranceMm,
  setPullRadiusMm,
  setShowLinks,
} from '@/app/store/slices/storySlice';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { buildStoryModel } from '@/features/stories/storyModel';
import {
  addSupportNodes,
  copyMembersBetweenStoreys,
  pullNodesToBase,
  showSupportIssue,
  snapToSupport,
} from './storeyActions';
import {
  checkSupportNodes,
  COPYABLE_TYPES,
  type CopyableType,
  type SupportCheckResult,
  type SupportIssue,
} from './storeyModel';

function NumberField({
  label,
  value,
  onCommit,
  step = 1,
}: {
  label: string;
  value: number;
  onCommit: (value: number) => void;
  step?: number;
}) {
  return (
    <label className="flex items-center gap-1 text-[10px] text-gray-500">
      {label}
      <Input
        key={value}
        type="number"
        step={step}
        defaultValue={value}
        className="h-6 w-16 px-1 text-xs"
        onBlur={(event) => {
          const next = Number(event.target.value);
          if (Number.isFinite(next) && next >= 0) onCommit(next);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') (event.target as HTMLInputElement).blur();
        }}
      />
    </label>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2 border-t border-gray-100 p-2">
      <h4 className="flex items-center gap-1.5 text-xs font-semibold">
        {icon}
        {title}
      </h4>
      {children}
    </div>
  );
}

const fmt = (value: number) => Math.round(value).toLocaleString();

function CopyMembers() {
  const storeys = useAppSelector(selectStoreys);
  const activeStoreyId = useAppSelector((state) => state.storey.activeStoreyId);
  const planSheets = useAppSelector((state) => state.planSheet.sheets);

  const [sourceId, setSourceId] = useState('');
  const [types, setTypes] = useState<CopyableType[]>(
    COPYABLE_TYPES.map((item) => item.type),
  );
  const [skipExisting, setSkipExisting] = useState(true);

  const target = storeys.find((storey) => storey.id === activeStoreyId) ?? null;
  const targetSheetId = target ? effectiveSheetId(target, storeys) : null;

  // Only storeys with a different plan sheet have anything to copy.
  const sources = storeys
    .filter((storey) => {
      const sheetId = effectiveSheetId(storey, storeys);
      return !!sheetId && sheetId !== targetSheetId;
    })
    .reverse();

  const source = sources.find((storey) => storey.id === sourceId) ?? sources[0] ?? null;
  const sheetName = (storeyId: string | null) => {
    const storey = storeys.find((item) => item.id === storeyId);
    const sheetId = storey ? effectiveSheetId(storey, storeys) : null;
    return planSheets.find((sheet) => sheet.id === sheetId)?.name ?? '';
  };

  const toggle = (type: CopyableType) =>
    setTypes((current) =>
      current.includes(type) ? current.filter((item) => item !== type) : [...current, type],
    );

  return (
    <Section title="Copy members to this storey" icon={<Copy className="h-3 w-3" />}>
      {!target || !targetSheetId ? (
        <p className="text-[10px] text-muted-foreground">
          Select the storey you are editing first (it needs a plan sheet).
        </p>
      ) : sources.length === 0 ? (
        <p className="text-[10px] text-muted-foreground">
          No other storey with a different plan sheet to copy from.
        </p>
      ) : (
        <>
          <label className="flex items-center gap-2 text-[10px] text-gray-500">
            From
            <select
              className="h-6 min-w-0 flex-1 rounded border border-gray-200 bg-white px-1 text-[11px]"
              value={source?.id ?? ''}
              onChange={(event) => setSourceId(event.target.value)}
            >
              {sources.map((storey) => (
                <option key={storey.id} value={storey.id}>
                  {storey.name} ({sheetName(storey.id)})
                </option>
              ))}
            </select>
          </label>

          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {COPYABLE_TYPES.map((item) => (
              <label key={item.type} className="flex items-center gap-1 text-[10px] text-gray-600">
                <input
                  type="checkbox"
                  checked={types.includes(item.type)}
                  onChange={() => toggle(item.type)}
                />
                {item.label}
              </label>
            ))}
          </div>

          <label className="flex items-center gap-2 text-[10px] text-gray-500">
            <Switch checked={skipExisting} onCheckedChange={setSkipExisting} />
            Skip members that already exist at the same place
          </label>

          <Button
            size="sm"
            className="h-7 w-full text-[11px]"
            disabled={!source || types.length === 0}
            onClick={() => {
              if (!source || !target) return;
              copyMembersBetweenStoreys({
                sourceStoreyId: source.id,
                targetStoreyId: target.id,
                types,
                skipExisting,
              });
            }}
          >
            <Copy className="mr-1 h-3 w-3" />
            Copy from {source?.name ?? '...'} to {target.name}
          </Button>

          <p className="text-[10px] leading-4 text-muted-foreground">
            Positions go through the shared origin, so the members land where the
            aligned plans put them.
          </p>
        </>
      )}
    </Section>
  );
}

function SupportCheck() {
  const dispatch = useAppDispatch();
  const toleranceMm = useAppSelector((state) => state.story.linkToleranceMm);
  const pullRadiusMm = useAppSelector((state) => state.story.pullRadiusMm);
  const storeyCount = useAppSelector((state) => state.storey.storeys.length);

  const [result, setResult] = useState<SupportCheckResult | null>(null);

  const run = () => {
    const next = checkSupportNodes(store.getState(), toleranceMm, pullRadiusMm);
    setResult(next);

    if (next.storeysChecked === 0) {
      toast.info('Need at least two storeys with plan sheets to check supports.');
    } else if (next.issues.length === 0) {
      toast.success(`All ${next.checkedPoints} column / wall points are supported.`);
    }
  };

  const fixAll = () => {
    if (!result) return;
    const added = addSupportNodes(result.issues);
    toast.success(`Added ${added} support node(s) on the storeys below.`);
    run();
  };

  const missing = result?.issues.filter((issue) => !issue.nearest) ?? [];

  return (
    <Section title="Node coordination check" icon={<ShieldCheck className="h-3 w-3" />}>
      <p className="text-[10px] leading-4 text-muted-foreground">
        Every column, wall and portal-frame end needs a node at the same X, Y on
        the storey below. The lowest storey stands on the base.
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <NumberField
          label="Tolerance (mm)"
          value={toleranceMm}
          step={10}
          onCommit={(value) => dispatch(setLinkToleranceMm(value))}
        />
        <NumberField
          label="Search (mm)"
          value={pullRadiusMm}
          step={50}
          onCommit={(value) => dispatch(setPullRadiusMm(value))}
        />
      </div>

      <Button
        size="sm"
        variant="outline"
        className="h-7 w-full text-[11px]"
        disabled={storeyCount < 2}
        onClick={run}
      >
        <ShieldCheck className="mr-1 h-3 w-3" />
        {result ? 'Check again' : 'Check storeys'}
      </Button>

      {result && result.storeysChecked > 0 && (
        <div className="space-y-1.5">
          {result.issues.length === 0 ? (
            <p className="flex items-center gap-1 text-[11px] text-green-600">
              <CheckCircle2 className="h-3 w-3" />
              All {result.checkedPoints} points are supported.
            </p>
          ) : (
            <>
              <p className="flex items-center gap-1 text-[11px] text-amber-700">
                <TriangleAlert className="h-3 w-3" />
                {result.issues.length} unsupported point
                {result.issues.length === 1 ? '' : 's'} (of {result.checkedPoints}).
              </p>

              <ul className="max-h-56 space-y-1 overflow-y-auto">
                {result.issues.map((issue) => (
                  <IssueRow key={issue.key} issue={issue} onChanged={run} />
                ))}
              </ul>

              {missing.length > 0 && (
                <Button
                  size="sm"
                  className="h-7 w-full text-[11px]"
                  onClick={fixAll}
                  title="Add a node under every unsupported point that has no node nearby"
                >
                  Add {missing.length} missing support node
                  {missing.length === 1 ? '' : 's'}
                </Button>
              )}
            </>
          )}
        </div>
      )}
    </Section>
  );
}

function IssueRow({
  issue,
  onChanged,
}: {
  issue: SupportIssue;
  onChanged: () => void;
}) {
  return (
    <li className="rounded border border-amber-200 bg-amber-50/50 p-1.5 text-[10px] leading-4">
      <div className="font-medium text-gray-700">
        {issue.upperName}: {issue.elementLabels.join(', ')}
      </div>
      <div className="text-muted-foreground">
        at ({fmt(issue.pointMm.x)}, {fmt(issue.pointMm.y)}) mm has no node on {issue.lowerName}
        {issue.nearest && <> (nearest node {fmt(issue.nearest.distMm)} mm away)</>}
      </div>

      <div className="mt-1 flex flex-wrap gap-1">
        <Button
          variant="outline"
          size="sm"
          className="h-5 px-1.5 text-[10px]"
          onClick={() => showSupportIssue(issue)}
        >
          Go to
        </Button>

        {issue.nearest && issue.upperNodeId && (
          <Button
            variant="outline"
            size="sm"
            className={cn('h-5 px-1.5 text-[10px]')}
            title="Move this node onto the nearest node of the storey below"
            onClick={() => {
              if (snapToSupport(issue)) onChanged();
            }}
          >
            Snap to node below
          </Button>
        )}

        <Button
          variant="outline"
          size="sm"
          className="h-5 px-1.5 text-[10px]"
          title={`Add a node on ${issue.lowerName} under this point`}
          onClick={() => {
            addSupportNodes([issue]);
            onChanged();
          }}
        >
          Add node below
        </Button>
      </div>
    </li>
  );
}

function ModelTools() {
  const dispatch = useAppDispatch();
  const showLinks = useAppSelector((state) => state.story.showLinks);
  const ghostSnap = useAppSelector((state) => state.story.ghostSnap);

  const exportModel = () => {
    const model = buildStoryModel(store.getState());

    if (!model.stories.length) {
      toast.error('Add storeys with plan sheets first.');
      return;
    }

    const blob = new Blob([JSON.stringify(model, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const anchor = window.document.createElement('a');
    anchor.href = url;
    anchor.download = 'structural-model-3d.json';
    anchor.click();
    URL.revokeObjectURL(url);

    toast.success(
      `Exported ${model.nodes.length} nodes, ${model.elements.length} elements, ${model.verticalMembers.length} vertical members.`,
    );
  };

  const pull = () => {
    const moved = pullNodesToBase();

    if (moved === null) {
      toast.error('Choose a base plan sheet (in the Plan Sheets list) first.');
    } else {
      toast.success(
        moved
          ? `Moved ${moved} node(s) onto the base plan's nodes.`
          : 'No nodes needed moving.',
      );
    }
  };

  return (
    <Section title="Display and export" icon={<Link2 className="h-3 w-3" />}>
      <div className="flex items-center justify-between text-xs text-gray-600">
        <span className="flex items-center gap-1">
          <Link2 className="h-3 w-3" />
          Show vertical links
        </span>
        <Switch checked={showLinks} onCheckedChange={(value) => dispatch(setShowLinks(value))} />
      </div>

      <div className="flex items-center justify-between text-xs text-gray-600">
        <span className="flex items-center gap-1">
          <Magnet className="h-3 w-3" />
          Snap to other storeys
        </span>
        <Switch checked={ghostSnap} onCheckedChange={(value) => dispatch(setGhostSnap(value))} />
      </div>

      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="h-7 flex-1 text-[11px]"
          onClick={pull}
          title="Move nodes of the other plans onto the base plan's nodes when they are within the search radius"
        >
          <Anchor className="mr-1 h-3 w-3" />
          Pull nodes to base
        </Button>

        <Button size="sm" className="h-7 flex-1 text-[11px]" onClick={exportModel}>
          <Download className="mr-1 h-3 w-3" />
          Export 3D model
        </Button>
      </div>
    </Section>
  );
}

export function StoreyTools() {
  return (
    <>
      <CopyMembers />
      <SupportCheck />
      <ModelTools />
    </>
  );
}

"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  DEFAULT_INTERPRETATION_BANDS,
  defaultInstrumentDraft,
  emptyBandDraft,
  emptyDomainDraft,
  emptyItemDraft,
  type InstrumentDraft,
} from "@/lib/admin/platform-assessments";
import { checkboxOptionClassName, fieldClassName, textareaClassName } from "@/lib/ui";

function weightShare(weights: number[], index: number) {
  const total = weights.reduce((sum, weight) => sum + (weight > 0 ? weight : 0), 0);
  if (total <= 0) return 0;
  return Math.round((weights[index]! / total) * 1000) / 10;
}

export function PlatformAssessmentEditor({
  name = "instrument",
  initial,
}: {
  name?: string;
  initial?: InstrumentDraft | null;
}) {
  const [instrument, setInstrument] = useState<InstrumentDraft>(
    initial && initial.domains.length > 0 ? initial : defaultInstrumentDraft()
  );

  const payload = useMemo(
    () => ({
      domains: instrument.domains.map((domain) => ({
        key: domain.key,
        title: domain.title,
        titleHe: domain.titleHe,
        description: domain.description,
        weight: domain.weight,
        items: domain.items.map((item) => ({
          prompt: item.prompt,
          promptHe: item.promptHe,
          reverseScored: item.reverseScored,
          weight: item.weight,
        })),
      })),
      bands: instrument.bands.map((band) => ({
        minScore: band.minScore,
        maxScore: band.maxScore,
        label: band.label,
        labelHe: band.labelHe,
        description: band.description,
        descriptionHe: band.descriptionHe,
      })),
    }),
    [instrument]
  );

  const domainWeights = instrument.domains.map((domain) => domain.weight);

  function updateDomain(clientId: string, patch: Partial<InstrumentDraft["domains"][number]>) {
    setInstrument((current) => ({
      ...current,
      domains: current.domains.map((domain) =>
        domain.clientId === clientId ? { ...domain, ...patch } : domain
      ),
    }));
  }

  function updateItem(
    domainId: string,
    itemId: string,
    patch: Partial<InstrumentDraft["domains"][number]["items"][number]>
  ) {
    setInstrument((current) => ({
      ...current,
      domains: current.domains.map((domain) =>
        domain.clientId !== domainId
          ? domain
          : {
              ...domain,
              items: domain.items.map((item) =>
                item.clientId === itemId ? { ...item, ...patch } : item
              ),
            }
      ),
    }));
  }

  return (
    <div className="space-y-6">
      <input type="hidden" name={name} value={JSON.stringify(payload)} />

      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-heading text-lg font-semibold">Weighted instrument</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Domains and questions each have a weight. Overall score is the
            weighted mean of domain scores, each domain the weighted mean of
            its Likert answers (1–5). Reverse-scored items flip the scale.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          className="w-full sm:w-auto"
          onClick={() =>
            setInstrument((current) => ({
              ...current,
              domains: [...current.domains, emptyDomainDraft()],
            }))
          }
        >
          Add domain
        </Button>
      </div>

      {instrument.domains.map((domain, domainIndex) => {
        const itemWeights = domain.items.map((item) => item.weight);
        return (
          <fieldset
            key={domain.clientId}
            className="space-y-4 rounded-xl border border-border bg-black/20 p-4 sm:p-5"
          >
            <legend className="px-1 font-heading text-sm font-semibold">
              Domain {domainIndex + 1}
              {domain.title ? ` · ${domain.title}` : ""}
              {` · ${weightShare(domainWeights, domainIndex)}% of overall`}
            </legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-2">
                <span className="text-sm text-muted-foreground">Title</span>
                <input
                  className={fieldClassName}
                  value={domain.title}
                  onChange={(event) =>
                    updateDomain(domain.clientId, { title: event.target.value })
                  }
                  required
                />
              </label>
              <label className="block space-y-2">
                <span className="text-sm text-muted-foreground">Hebrew title</span>
                <input
                  className={fieldClassName}
                  value={domain.titleHe}
                  onChange={(event) =>
                    updateDomain(domain.clientId, { titleHe: event.target.value })
                  }
                  dir="rtl"
                />
              </label>
              <label className="block space-y-2">
                <span className="text-sm text-muted-foreground">Key (optional)</span>
                <input
                  className={fieldClassName}
                  value={domain.key}
                  onChange={(event) =>
                    updateDomain(domain.clientId, { key: event.target.value })
                  }
                  placeholder="auto-from-title"
                />
              </label>
              <label className="block space-y-2">
                <span className="text-sm text-muted-foreground">Domain weight</span>
                <input
                  className={fieldClassName}
                  type="number"
                  min={0.01}
                  max={99.99}
                  step={0.01}
                  value={domain.weight}
                  onChange={(event) =>
                    updateDomain(domain.clientId, {
                      weight: Number(event.target.value),
                    })
                  }
                  required
                />
              </label>
            </div>
            <label className="block space-y-2">
              <span className="text-sm text-muted-foreground">Description (optional)</span>
              <textarea
                className={textareaClassName}
                value={domain.description}
                onChange={(event) =>
                  updateDomain(domain.clientId, { description: event.target.value })
                }
              />
            </label>

            <div className="space-y-3">
              {domain.items.map((item, itemIndex) => (
                <div
                  key={item.clientId}
                  className="space-y-3 rounded-lg border border-border bg-black/20 p-3 sm:p-4"
                >
                  <p className="text-sm font-medium">
                    Question {itemIndex + 1}
                    {` · ${weightShare(itemWeights, itemIndex)}% of this domain`}
                  </p>
                  <label className="block space-y-2">
                    <span className="text-sm text-muted-foreground">Prompt</span>
                    <textarea
                      className={textareaClassName}
                      value={item.prompt}
                      onChange={(event) =>
                        updateItem(domain.clientId, item.clientId, {
                          prompt: event.target.value,
                        })
                      }
                      required
                    />
                  </label>
                  <label className="block space-y-2">
                    <span className="text-sm text-muted-foreground">Hebrew prompt</span>
                    <textarea
                      className={textareaClassName}
                      value={item.promptHe}
                      onChange={(event) =>
                        updateItem(domain.clientId, item.clientId, {
                          promptHe: event.target.value,
                        })
                      }
                      dir="rtl"
                    />
                  </label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block space-y-2">
                      <span className="text-sm text-muted-foreground">Question weight</span>
                      <input
                        className={fieldClassName}
                        type="number"
                        min={0.01}
                        max={99.99}
                        step={0.01}
                        value={item.weight}
                        onChange={(event) =>
                          updateItem(domain.clientId, item.clientId, {
                            weight: Number(event.target.value),
                          })
                        }
                        required
                      />
                    </label>
                    <label className={checkboxOptionClassName}>
                      <input
                        type="checkbox"
                        checked={item.reverseScored}
                        className="size-4 accent-primary"
                        onChange={(event) =>
                          updateItem(domain.clientId, item.clientId, {
                            reverseScored: event.target.checked,
                          })
                        }
                      />
                      <span>Reverse scored</span>
                    </label>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button
                      type="button"
                      variant="ghost"
                      className="w-full sm:w-auto"
                      disabled={domain.items.length === 1}
                      onClick={() =>
                        updateDomain(domain.clientId, {
                          items: domain.items.filter((row) => row.clientId !== item.clientId),
                        })
                      }
                    >
                      Remove question
                    </Button>
                  </div>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() =>
                  updateDomain(domain.clientId, {
                    items: [...domain.items, emptyItemDraft()],
                  })
                }
              >
                Add question
              </Button>
            </div>

            <Button
              type="button"
              variant="ghost"
              className="w-full sm:w-auto"
              disabled={instrument.domains.length === 1}
              onClick={() =>
                setInstrument((current) => ({
                  ...current,
                  domains: current.domains.filter((row) => row.clientId !== domain.clientId),
                }))
              }
            >
              Remove domain
            </Button>
          </fieldset>
        );
      })}

      <div className="space-y-4 rounded-xl border border-border bg-card p-4 sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="font-heading text-lg font-semibold">Interpretation bands</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Bands read the overall score from 0 to 100. Fathers see the
              matching label after they finish.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() =>
                setInstrument((current) => ({
                  ...current,
                  bands: DEFAULT_INTERPRETATION_BANDS.map((band) =>
                    emptyBandDraft({
                      minScore: band.minScore,
                      maxScore: band.maxScore,
                      label: band.label,
                      description: band.description,
                    })
                  ),
                }))
              }
            >
              Use default bands
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() =>
                setInstrument((current) => ({
                  ...current,
                  bands: [...current.bands, emptyBandDraft()],
                }))
              }
            >
              Add band
            </Button>
          </div>
        </div>

        {instrument.bands.map((band, index) => (
          <div
            key={band.clientId}
            className="grid gap-3 rounded-lg border border-border bg-black/20 p-3 sm:grid-cols-2 sm:p-4"
          >
            <label className="block space-y-2">
              <span className="text-sm text-muted-foreground">Label</span>
              <input
                className={fieldClassName}
                value={band.label}
                onChange={(event) =>
                  setInstrument((current) => ({
                    ...current,
                    bands: current.bands.map((row) =>
                      row.clientId === band.clientId
                        ? { ...row, label: event.target.value }
                        : row
                    ),
                  }))
                }
                required
              />
            </label>
            <label className="block space-y-2">
              <span className="text-sm text-muted-foreground">Hebrew label</span>
              <input
                className={fieldClassName}
                value={band.labelHe}
                dir="rtl"
                onChange={(event) =>
                  setInstrument((current) => ({
                    ...current,
                    bands: current.bands.map((row) =>
                      row.clientId === band.clientId
                        ? { ...row, labelHe: event.target.value }
                        : row
                    ),
                  }))
                }
              />
            </label>
            <label className="block space-y-2">
              <span className="text-sm text-muted-foreground">From</span>
              <input
                className={fieldClassName}
                type="number"
                min={0}
                max={100}
                value={band.minScore}
                onChange={(event) =>
                  setInstrument((current) => ({
                    ...current,
                    bands: current.bands.map((row) =>
                      row.clientId === band.clientId
                        ? { ...row, minScore: Number(event.target.value) }
                        : row
                    ),
                  }))
                }
                required
              />
            </label>
            <label className="block space-y-2">
              <span className="text-sm text-muted-foreground">To</span>
              <input
                className={fieldClassName}
                type="number"
                min={0}
                max={100}
                value={band.maxScore}
                onChange={(event) =>
                  setInstrument((current) => ({
                    ...current,
                    bands: current.bands.map((row) =>
                      row.clientId === band.clientId
                        ? { ...row, maxScore: Number(event.target.value) }
                        : row
                    ),
                  }))
                }
                required
              />
            </label>
            <label className="block space-y-2 sm:col-span-2">
              <span className="text-sm text-muted-foreground">What the father sees</span>
              <textarea
                className={textareaClassName}
                value={band.description}
                onChange={(event) =>
                  setInstrument((current) => ({
                    ...current,
                    bands: current.bands.map((row) =>
                      row.clientId === band.clientId
                        ? { ...row, description: event.target.value }
                        : row
                    ),
                  }))
                }
              />
            </label>
            <Button
              type="button"
              variant="ghost"
              className="w-full sm:w-auto"
              disabled={instrument.bands.length === 1}
              onClick={() =>
                setInstrument((current) => ({
                  ...current,
                  bands: current.bands.filter((row) => row.clientId !== band.clientId),
                }))
              }
            >
              Remove band {index + 1}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

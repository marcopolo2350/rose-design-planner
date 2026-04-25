'use client'

import type { AssetInput } from '@pascal-app/core'
import { resolveCdnUrl } from '@pascal-app/viewer'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from './../../../components/ui/primitives/tooltip'
import { useIsMobile } from './../../../hooks/use-mobile'
import { assetPath } from './../../../lib/asset-path'
import { cn } from './../../../lib/utils'
import useEditor, { type CatalogCategory } from './../../../store/use-editor'
import { CATALOG_ITEMS } from './catalog-items'

const PLACEMENT_TAGS = new Set(['floor', 'wall', 'ceiling', 'countertop'])

export function ItemCatalog({ category }: { category: CatalogCategory }) {
  const selectedItem = useEditor((state) => state.selectedItem)
  const setSelectedItem = useEditor((state) => state.setSelectedItem)
  const isMobile = useIsMobile()
  const [activePlacementTag, setActivePlacementTag] = useState<string | null>(null)
  const [activeFunctionalTag, setActiveFunctionalTag] = useState<string | null>(null)

  const categoryItems = CATALOG_ITEMS.filter((item) => item.category === category)

  // Collect tags available in this category
  const allTags = Array.from(new Set(categoryItems.flatMap((item) => item.tags ?? [])))
  const placementTags = allTags.filter((t) => PLACEMENT_TAGS.has(t))
  const functionalTags = allTags.filter((t) => !PLACEMENT_TAGS.has(t))
  const hasFilters = allTags.length > 1

  // Count items for a placement tag given the current functional filter
  const placementCount = (tag: string | null) =>
    categoryItems.filter((item) => {
      const tags = item.tags ?? []
      if (tag !== null && !tags.includes(tag)) return false
      if (activeFunctionalTag && !tags.includes(activeFunctionalTag)) return false
      return true
    }).length

  // Count items for a functional tag given the current placement filter
  const functionalCount = (tag: string) =>
    categoryItems.filter((item) => {
      const tags = item.tags ?? []
      if (!tags.includes(tag)) return false
      if (activePlacementTag && !tags.includes(activePlacementTag)) return false
      return true
    }).length

  const filteredItems = categoryItems.filter((item) => {
    const tags = item.tags ?? []
    if (activePlacementTag && !tags.includes(activePlacementTag)) return false
    if (activeFunctionalTag && !tags.includes(activeFunctionalTag)) return false
    return true
  })

  // Auto-select first item if current selection is not in the filtered list
  useEffect(() => {
    const isCurrentItemInCategory = filteredItems.some((item) => item.src === selectedItem?.src)
    if (!isCurrentItemInCategory && filteredItems.length > 0) {
      setSelectedItem(filteredItems[0] as AssetInput)
    }
  }, [filteredItems, selectedItem?.src, setSelectedItem])

  // Get attachment icon based on attachTo type
  const getAttachmentIcon = (attachTo: AssetInput['attachTo']) => {
    if (attachTo === 'wall' || attachTo === 'wall-side') {
      return assetPath('/icons/wall.png')
    }
    if (attachTo === 'ceiling') {
      return assetPath('/icons/ceiling.png')
    }
    return null
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Filter chips */}
      {hasFilters && (
        <div className="flex flex-col gap-1.5">
          {/* Placement row */}
          {placementTags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              <button
                className={cn(
                  'cursor-pointer rounded-md px-2 py-0.5 font-medium text-xs transition-colors',
                  activePlacementTag === null
                    ? 'bg-blue-500 text-white'
                    : 'bg-blue-950/50 text-blue-300 hover:bg-blue-900/60 hover:text-blue-200',
                )}
                onClick={() => setActivePlacementTag(null)}
                type="button"
              >
                All
              </button>
              {placementTags.map((tag) => {
                const count = placementCount(tag)
                const isActive = activePlacementTag === tag
                const isEmpty = count === 0 && !isActive
                return (
                  <button
                    className={cn(
                      'inline-flex cursor-pointer items-center gap-1 rounded-md py-0.5 pr-1.5 pl-2 font-medium text-xs capitalize transition-colors',
                      isActive
                        ? 'bg-blue-500 text-white'
                        : isEmpty
                          ? 'cursor-not-allowed bg-zinc-800 text-zinc-500'
                          : 'bg-blue-950/50 text-blue-300 hover:bg-blue-900/60 hover:text-blue-200',
                    )}
                    disabled={isEmpty}
                    key={tag}
                    onClick={() => setActivePlacementTag(isActive ? null : tag)}
                    type="button"
                  >
                    {tag}
                    <span
                      className={cn(
                        'text-[10px]',
                        isActive ? 'text-blue-200' : isEmpty ? 'text-zinc-600' : 'text-blue-500/70',
                      )}
                    >
                      {count}
                    </span>
                  </button>
                )
              })}
            </div>
          )}

          {/* Functional row */}
          {functionalTags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {functionalTags.map((tag) => {
                const count = functionalCount(tag)
                const isActive = activeFunctionalTag === tag
                const isEmpty = count === 0 && !isActive
                return (
                  <button
                    className={cn(
                      'inline-flex cursor-pointer items-center gap-1 rounded-md py-0.5 pr-1.5 pl-2 font-medium text-xs capitalize transition-colors',
                      isActive
                        ? 'bg-violet-500 text-white'
                        : isEmpty
                          ? 'cursor-not-allowed bg-zinc-800 text-zinc-500'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground',
                    )}
                    disabled={isEmpty}
                    key={tag}
                    onClick={() => setActiveFunctionalTag(isActive ? null : tag)}
                    type="button"
                  >
                    {tag}
                    <span
                      className={cn(
                        'text-[10px]',
                        isActive
                          ? 'text-violet-200'
                          : isEmpty
                            ? 'text-zinc-600'
                            : 'text-zinc-500/70',
                      )}
                    >
                      {count}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Items */}
      <div className={cn('-my-2 flex gap-2 overflow-x-auto p-2', isMobile ? '-mx-1' : '-mx-2 max-w-xl')}>
        {filteredItems.map((item, index) => {
          const isSelected = selectedItem?.src === item?.src
          const attachmentIcon = getAttachmentIcon(item?.attachTo)
          return (
            <Tooltip key={index}>
              <TooltipTrigger asChild>
                <button
                  aria-label={`Select ${item.name}`}
                  className={cn(
                    'relative shrink-0 overflow-hidden rounded-lg transition-all duration-200 ease-out hover:cursor-pointer',
                    isMobile
                      ? 'flex h-[5.4rem] min-h-[5.4rem] w-[5.4rem] min-w-[5.4rem] flex-col justify-end bg-card p-1.5 text-left'
                      : 'aspect-square h-14 min-h-14 w-14 min-w-14 flex-col gap-px hover:scale-105',
                    isSelected && 'ring-2 ring-primary-foreground',
                  )}
                  onClick={() => setSelectedItem(item)}
                  type="button"
                >
                  <Image
                    alt={item.name}
                    className={cn('object-cover', isMobile ? 'rounded-md' : 'rounded-lg')}
                    fill
                    loading={index < 8 ? 'eager' : 'lazy'}
                    sizes={isMobile ? '86px' : '56px'}
                    src={resolveCdnUrl(item.thumbnail) || ''}
                  />
                  <div
                    className={cn(
                      'pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent',
                      isMobile ? 'h-11 rounded-b-md' : 'h-7 rounded-b-lg',
                    )}
                  />
                  <span
                    className={cn(
                      'pointer-events-none absolute right-1 left-1 bottom-1 truncate font-medium text-white',
                      isMobile ? 'text-[11px]' : 'hidden',
                    )}
                  >
                    {item.name}
                  </span>
                  {attachmentIcon && (
                    <div className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded bg-black/60">
                      <Image
                        alt={item.attachTo === 'ceiling' ? 'Ceiling attachment' : 'Wall attachment'}
                        className="h-4 w-4"
                        height={16}
                        src={attachmentIcon}
                        width={16}
                      />
                    </div>
                  )}
                </button>
              </TooltipTrigger>
              {!isMobile && (
                <TooltipContent className="text-xs" side="top">
                  {item.name}
                </TooltipContent>
              )}
            </Tooltip>
          )
        })}
      </div>
    </div>
  )
}

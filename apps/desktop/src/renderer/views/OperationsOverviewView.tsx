import { BotAvatar } from '../components/Avatar'
import { Button } from '../components/Controls'
import { Icon } from '../components/Icon'
import { ModalHeader, Sheet, SheetPage } from '../components/Overlay'
import { HStack, Spacer, VStack } from '../components/Stack'
import { Text } from '../components/Text'
import { useTr } from '../lib/use-language'
import { isOpen } from '@shared/work'
import { refKey, type BotRef, type RosterItem } from '../store/app-model'
import type { BotStore } from '../store/bot-store'
import { StoreContext } from '../store/context'
import { LiveWork } from './chat/WorkRows'

type Props = {
  open: boolean
  roster: RosterItem[]
  stores: BotStore[]
  onClose: () => void
  openDetails: (ref: BotRef) => void
  openCard: (ref: BotRef, taskId: string) => void
  openThread: (ref: BotRef, threadId: string) => void
}

const needsAttention = (bot: RosterItem['bot']) =>
  bot.status === 'needsInput' || bot.work.some((task) => task.status === 'needsYou' || task.status === 'failed')

function Metric({ label, value, note, tone = 'text' }: { label: string; value: number; note: string; tone?: 'text' | 'attention' | 'danger' }) {
  return (
    <div className="operations-metric">
      <Text size="caption" tone="secondary">{label}</Text>
      <Text size="largeTitle" tone={tone} weight="semibold" tabular>{value}</Text>
      <Text size="caption" tone="secondary">{note}</Text>
    </div>
  )
}

export function OperationsOverviewSheet({ open, roster, stores, onClose, openDetails, openCard, openThread }: Props) {
  const tr = useTr()
  const tasks = roster.flatMap(({ bot }) => bot.work)
  const active = tasks.filter((task) => task.status === 'working').length
  const waiting = tasks.filter((task) => task.status === 'waiting').length
  const attention = roster.filter(({ bot }) => needsAttention(bot))
  const failed = tasks.filter((task) => task.status === 'failed').length
  const connected = stores.filter((store) => store.shownConnection.kind === 'online' && !store.mismatch).length
  const openBotCount = roster.filter(({ bot }) => bot.work.some(isOpen)).length
  const sorted = [...roster].sort((a, b) => {
    const aUrgent = needsAttention(a.bot) ? 1 : 0
    const bUrgent = needsAttention(b.bot) ? 1 : 0
    return bUrgent - aUrgent || Number(b.bot.work.some(isOpen)) - Number(a.bot.work.some(isOpen)) || a.bot.name.localeCompare(b.bot.name)
  })

  return (
    <Sheet open={open} onClose={onClose} width={760} maxHeight={820} dismissOnDim>
      <SheetPage>
        <ModalHeader icon="chart.bar" title={tr('Operations overview')} subtitle={tr('Live view of your Codync bots and their current work.')} />
        <VStack gap={16} className="operations-overview">
          <div className="operations-metrics">
            <Metric label={tr('Connected computers')} value={connected} note={tr('{count} of {total} online').replaceAll('{count}', String(connected)).replaceAll('{total}', String(stores.length))} />
            <Metric label={tr('Bots')} value={roster.length} note={tr('{count} with open work').replaceAll('{count}', String(openBotCount))} />
            <Metric label={tr('Working')} value={active} note={tr('Tasks running now')} />
            <Metric label={tr('Waiting')} value={waiting} note={tr('Tasks in queue')} />
            <Metric label={tr('Needs attention')} value={attention.length} note={tr('{count} failed tasks').replaceAll('{count}', String(failed))} tone={attention.length + failed ? 'attention' : 'text'} />
          </div>

          <VStack gap={8}>
            <HStack align="center">
              <Text size="title3" weight="semibold">{tr('Attention')}</Text>
              <Spacer />
              <Text size="caption" tone="secondary">{tr('{count} bots').replaceAll('{count}', String(attention.length))}</Text>
            </HStack>
            {attention.length === 0 && failed === 0 ? (
              <div className="operations-empty">
                <Icon name="checkmark.circle" size={18} color="var(--added)" />
                <Text size="callout" tone="secondary">{tr('No bot currently needs your attention.')}</Text>
              </div>
            ) : (
              <VStack gap={6}>
                {attention.map(({ ref, bot, computer }) => (
                  <button key={refKey(ref)} className="operations-attention-row" onClick={() => openDetails(ref)}>
                    <BotAvatar bot={bot} size={24} animated={false} />
                    <VStack gap={2} grow>
                      <Text size="body" weight="medium">{bot.name}</Text>
                      <Text size="caption" tone="secondary">{bot.status === 'needsInput' || bot.work.some((task) => task.status === 'needsYou') ? tr('Waiting for your response') : tr('Has failed work')}</Text>
                    </VStack>
                    <Text size="caption" tone="secondary">{computer.name}</Text>
                    <Icon name="chevron.right" size={11} color="var(--tertiary)" />
                  </button>
                ))}
                {failed > 0 ? <Text size="caption" tone="secondary">{tr('{count} failed task(s) are included in the bot work lists below.').replaceAll('{count}', String(failed))}</Text> : null}
              </VStack>
            )}
          </VStack>

          <VStack gap={8}>
            <HStack align="center">
              <Text size="title3" weight="semibold">{tr('Bot activity')}</Text>
              <Spacer />
              <Text size="caption" tone="secondary">{tr('{count} bots').replaceAll('{count}', String(roster.length))}</Text>
            </HStack>
            {sorted.length === 0 ? (
              <div className="operations-empty"><Text size="callout" tone="secondary">{tr('No bots are available on the selected computers.')}</Text></div>
            ) : (
              <VStack gap={8}>
                {sorted.map(({ ref, bot, computer, store }) => {
                  const current = openTasks(bot.work)
                  const completed = bot.work.filter((task) => task.status === 'done').length
                  const failedCount = bot.work.filter((task) => task.status === 'failed').length
                  return (
                    <StoreContext.Provider key={refKey(ref)} value={store}>
                      <div className="operations-bot-card">
                        <HStack align="center" gap={10}>
                          <BotAvatar bot={bot} size={30} animated={false} />
                          <VStack gap={2} grow>
                            <Text size="body" weight="semibold">{bot.name}</Text>
                            <Text size="caption" tone="secondary">{computer.name} · {bot.status === 'working' ? tr(bot.activity || 'Working') : bot.status === 'needsInput' ? tr('Needs your response') : tr(bot.status)}</Text>
                          </VStack>
                          <Text size="caption" tone="secondary">{current.length ? tr('{count} open').replaceAll('{count}', String(current.length)) : tr('No open work')}</Text>
                          <Button kind="secondary" onClick={() => openDetails(ref)}>{tr('Open')}</Button>
                        </HStack>
                        {current.length ? (
                          <div className="operations-live-work">
                            <LiveWork bot={bot} plain openCard={(taskId) => openCard(ref, taskId)} openThread={(threadId) => openThread(ref, threadId)} />
                          </div>
                        ) : (
                          <HStack gap={12} className="operations-bot-summary">
                            <Text size="caption" tone="secondary">{tr('{count} completed').replaceAll('{count}', String(completed))}</Text>
                            {failedCount ? <Text size="caption" tone="danger">{tr('{count} failed').replaceAll('{count}', String(failedCount))}</Text> : null}
                          </HStack>
                        )}
                      </div>
                    </StoreContext.Provider>
                  )
                })}
              </VStack>
            )}
          </VStack>

          <VStack gap={8}>
            <Text size="title3" weight="semibold">{tr('Computer health')}</Text>
            <div className="operations-computers">
              {stores.map((store) => (
                <div className="operations-computer-row" key={store.computer.id}>
                  <Icon name={store.shownConnection.kind === 'online' ? 'checkmark.circle.fill' : 'exclamationmark.circle'} size={16} color={store.shownConnection.kind === 'online' ? 'var(--added)' : 'var(--attention)'} />
                  <VStack gap={2} grow>
                    <Text size="body" weight="medium">{store.hostName}</Text>
                    <Text size="caption" tone="secondary">{store.connectionLabel}</Text>
                  </VStack>
                  <Text size="caption" tone="secondary">{store.bots.size} {tr('bots')}</Text>
                </div>
              ))}
            </div>
          </VStack>
          <Text size="caption" tone="secondary">{tr('Live data from connected Codync hosts. External project collectors and source coverage are not yet represented in this overview.')}</Text>
        </VStack>
      </SheetPage>
    </Sheet>
  )
}

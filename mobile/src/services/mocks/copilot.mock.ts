import type { CopilotActivity, CopilotService, CopilotTask } from '../http/copilot.http';
import { mockDelay } from './delay';
import { getMemberById, upsertMember } from './mock-store';
import { getMockSessionUserId } from './mock-session';
import { mockComplianceService } from './compliance.mock';

function me() {
  const uid = getMockSessionUserId();
  return uid ? getMemberById(uid) : undefined;
}

const log = (text: string, kind: string): CopilotActivity => ({ id: `ev-${Date.now()}-${Math.random()}`, kind, text, at: new Date().toISOString() });

/**
 * The Copilot on demo data: the same plan the backend makes without an AI
 * model (backend/src/modules/copilot/planner.ts), from the demo founder's
 * profile, checklist and matches. Suggestions wait for approval.
 */
export const mockCopilotService: CopilotService = {
  async ask(message) {
    await mockDelay(900);
    const member = me();
    if (!member) throw { code: 'UNAUTHORIZED', message: 'Sign in to continue.' };
    const first = member.user.fullName.split(' ')[0];
    const events: CopilotActivity[] = [log(`You asked: “${message.slice(0, 120)}”`, 'asked')];
    const tasks = member.tasks ?? [];
    const proposals: CopilotTask[] = [];
    const propose = (title: string, link: string, detail: string | null = null, days = 7) => {
      if (tasks.some((t) => t.title.toLowerCase() === title.toLowerCase() && (t.status === 'proposed' || t.status === 'open'))) return;
      const task: CopilotTask = {
        id: `task-${Date.now()}-${proposals.length}`,
        title,
        detail,
        dueDate: new Date(Date.now() + days * 86400000).toISOString().slice(0, 10),
        status: 'proposed',
        source: 'copilot',
        link,
      };
      proposals.push(task);
      events.push(log(`Suggested: ${title}`, 'proposed'));
    };

    events.push(log('Read your business profile', 'tool'));
    const profile = member.founderProfile;
    if (!profile) {
      propose('Set up your business profile', '/founder/onboarding', 'Everything else is built from it.', 2);
      member.tasks = [...proposals, ...tasks];
      member.copilotLog = [...events.reverse(), ...(member.copilotLog ?? [])];
      upsertMember(member);
      return { reply: `Hi ${first}. Let's start with your business profile: matches, your checklist and expert suggestions are all built from it. I have suggested it as your first task.`, engine: 'rules', proposals, note: null };
    }

    events.push(log('Checked your readiness checklist', 'tool'), log('Looked for investors who fit', 'tool'), log('Looked for experts who can help', 'tool'));
    const items = await mockComplianceService.listItems();
    const toDo = items.filter((i) => i.status !== 'complete');
    const done = items.length - toDo.length;
    const verified = member.user.approvalStatus === 'approved';
    const lines: string[] = [];
    const step = (t: string) => lines.push(`${lines.length + 1}. ${t}`);

    if (!verified) {
      step('Get verified. Investors can only see your name and reply once a person at FoundersLink has checked you.');
      propose('Finish verification', '/founder/verify', 'Confirm your phone and send a short statement.', 3);
    }
    if (profile.profileCompleteness < 100) {
      step(`Finish your business profile (${profile.profileCompleteness}% done). Investors read it before they decide to reach out.`);
      propose('Complete your business profile', '/founder/onboarding', null, 5);
    }
    if (toDo.length) {
      step(`Work on your readiness checklist (${done} of ${items.length} done). Start with ${toDo.slice(0, 2).map((i) => i.label).join(' and ')}.`);
      for (const i of toDo.slice(0, 2)) propose(`Complete: ${i.label}`, '/readiness');
    }
    const fit = member.matches.applyNow[0];
    if (fit) step(`${fit.anonymised ? fit.displayName : (fit.organisationName ?? fit.displayName)} fits you now (${fit.reasons[0]?.text.toLowerCase() ?? 'a strong fit'}). ${verified ? 'Look at their full fit and decide whether to connect.' : 'Once you are verified you can connect.'}`);
    step('For anything legal or tax, Wanjiku Kamau (lawyer) has sessions free this month.');

    events.push(log('Answered from your data, without an AI model', 'answered'));
    member.tasks = [...proposals, ...tasks];
    member.copilotLog = [...events.reverse(), ...(member.copilotLog ?? [])];
    upsertMember(member);
    return {
      reply: `Hi ${first}. Here is what I would focus on this week:\n\n${lines.join('\n')}\n\nI have suggested tasks for the most important ones. Approve the ones you want on your list.`,
      engine: 'rules',
      proposals,
      note: null,
    };
  },

  async tasks() {
    await mockDelay(200);
    return (me()?.tasks ?? []).filter((t) => t.status !== 'dismissed');
  },

  async decide(taskId, action) {
    await mockDelay(200);
    const member = me();
    const task = member?.tasks?.find((t) => t.id === taskId);
    if (!member || !task) throw { code: 'NOT_FOUND', message: 'No such task.' };
    const next = { approve: 'open', dismiss: 'dismissed', done: 'done', reopen: 'open' } as const;
    task.status = next[action];
    const words = { approve: 'You approved', dismiss: 'You dismissed', done: 'You finished', reopen: 'You reopened' } as const;
    member.copilotLog = [log(`${words[action]}: ${task.title}`, action), ...(member.copilotLog ?? [])];
    upsertMember(member);
    return { ...task };
  },

  async addTask(title, dueDate) {
    await mockDelay(200);
    const member = me();
    if (!member) throw { code: 'UNAUTHORIZED', message: 'Sign in to continue.' };
    const task: CopilotTask = { id: `task-${Date.now()}`, title, detail: null, dueDate: dueDate ?? null, status: 'open', source: 'founder', link: null };
    member.tasks = [task, ...(member.tasks ?? [])];
    upsertMember(member);
    return task;
  },

  async activity() {
    await mockDelay(200);
    return me()?.copilotLog ?? [];
  },
};

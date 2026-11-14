import { WorkspaceTabs } from '../../../src/components/layout/WorkspaceTabs';

// The expert's workspace: founders who ask for help, the sessions she runs,
// and her profile. Messages open from the top bar on a phone and from the
// side menu on a computer.
export default function ExpertTabsLayout() {
  return (
    <WorkspaceTabs
      role="expert"
      screens={[
        { name: 'sessions', title: 'Home' },
        { name: 'expert-profile', title: 'Profile' },
        { name: 'updates', title: 'Notifications', hidden: true },
      ]}
    />
  );
}

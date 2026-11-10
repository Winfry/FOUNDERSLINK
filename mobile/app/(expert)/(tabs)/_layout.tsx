import { CalendarCheck, CircleUserRound } from 'lucide-react-native';
import { WorkspaceTabs } from '../../../src/components/layout/WorkspaceTabs';

// The expert's workspace: founders who ask for help, the sessions she runs,
// and her profile. Messages and Settings open from the side menu on a
// computer, and from the overview and profile on a phone.
export default function ExpertTabsLayout() {
  return (
    <WorkspaceTabs
      role="expert"
      screens={[
        { name: 'sessions', title: 'Overview', icon: CalendarCheck },
        { name: 'expert-profile', title: 'Profile', icon: CircleUserRound },
        { name: 'updates', title: 'Notifications', hidden: true },
      ]}
    />
  );
}

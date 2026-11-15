import { CircleUserRound, House, Menu } from 'lucide-react-native';
import { WorkspaceTabs } from '../../../src/components/layout/WorkspaceTabs';

// The expert's workspace: founders who ask for help, the sessions she runs,
// and her profile. "More" holds everything else on the side menu.
export default function ExpertTabsLayout() {
  return (
    <WorkspaceTabs
      role="expert"
      screens={[
        { name: 'sessions', title: 'Home', icon: House },
        { name: 'expert-profile', title: 'Profile', icon: CircleUserRound },
        { name: 'expert-more', title: 'More', icon: Menu },
        { name: 'updates', title: 'Notifications', hidden: true },
      ]}
    />
  );
}

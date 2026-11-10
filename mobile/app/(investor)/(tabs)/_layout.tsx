import { Compass, LayoutDashboard, Send } from 'lucide-react-native';
import { WorkspaceTabs } from '../../../src/components/layout/WorkspaceTabs';

// The investor's workspace: businesses matched to what she funds, her
// requests and her deals. No Chamas: chamas are for founders (D14).
// Profile is opened from the avatar (and the side menu on a computer).
export default function InvestorTabsLayout() {
  return (
    <WorkspaceTabs
      role="investor"
      screens={[
        { name: 'overview', title: 'Overview', icon: LayoutDashboard },
        { name: 'discover', title: 'Find businesses', icon: Compass },
        { name: 'requests', title: 'Requests', icon: Send },
        { name: 'profile', title: 'Profile', hidden: true },
        { name: 'notifications', title: 'Notifications', hidden: true },
      ]}
    />
  );
}

import { Compass, House, Menu, Send, Wallet } from 'lucide-react-native';
import { WorkspaceTabs } from '../../../src/components/layout/WorkspaceTabs';

// The investor's workspace: businesses matched to what she funds, her
// requests and her investments. "More" holds everything else on the side
// menu. No Chamas: chamas are for founders (D14).
export default function InvestorTabsLayout() {
  return (
    <WorkspaceTabs
      role="investor"
      screens={[
        { name: 'overview', title: 'Home', icon: House },
        { name: 'discover', title: 'Businesses', icon: Compass },
        { name: 'requests', title: 'Requests', icon: Send },
        { name: 'investments', title: 'Investments', icon: Wallet },
        { name: 'investor-more', title: 'More', icon: Menu },
        { name: 'investor-copilot', title: 'Co-pilot', hidden: true },
        { name: 'profile', title: 'Profile', hidden: true },
        { name: 'notifications', title: 'Notifications', hidden: true },
      ]}
    />
  );
}

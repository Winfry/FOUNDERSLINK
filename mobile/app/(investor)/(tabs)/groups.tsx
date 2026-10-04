import { withBackdrop } from '../../../src/components/ui/ScreenBackdrop';
import { ChamasList } from '../../../src/components/chama/ChamasList';

function InvestorGroupsTab() {
  return <ChamasList />;
}

export default withBackdrop(InvestorGroupsTab);

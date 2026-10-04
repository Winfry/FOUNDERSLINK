import { withBackdrop } from '../../../src/components/ui/ScreenBackdrop';
import { ChamasList } from '../../../src/components/chama/ChamasList';

function ChamasScreen() {
  return <ChamasList />;
}

export default withBackdrop(ChamasScreen);

import { hasPossibleEntryCode } from '../access-warning';
import { estimateJob } from '../pricing';
import { defaultJob } from '../catalog';
it.each(['combo 4821#', 'Garage opener 7391', 'Enter via back, #2291', 'Gate code 4821'])('warns without disabling price: %s', text => {
 expect(hasPossibleEntryCode(text)).toBe(true);
 expect(estimateJob({ ...defaultJob(), operatorNotes: text }).selectedPrice).toBeGreaterThan(0);
});
it.each(['sweeping and mopping', 'Keystone Cleaning', 'Pinnacle Maids', 'interior doors', 'Gateway 7391'])('does not match fragments: %s', text => expect(hasPossibleEntryCode(text)).toBe(false));

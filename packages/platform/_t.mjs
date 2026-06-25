import { createPptbAdapter } from './dist/pptbAdapter.js';
const entities = [
  { LogicalName:'account', DisplayName:{UserLocalizedLabel:{Label:'Account'}}, IsCustomEntity:false, EntitySetName:'accounts' },
  { LogicalName:'new_widget', DisplayName:{UserLocalizedLabel:{Label:'Widget'}}, IsCustomEntity:true, EntitySetName:'new_widgets' },
];
async function check(label, resolved){
  const dv = { getAllEntitiesMetadata: async () => resolved };
  const a = createPptbAdapter(undefined, dv);
  const t = await a.getTables();
  console.log(label, '->', JSON.stringify(t.map(x=>({d:x.displayName,s:x.isSystem,set:x.entitySetName}))));
}
await check('wrapped {value:[]}', { value: entities });
await check('bare []        ', entities);
await check('empty wrapped  ', { value: [] });

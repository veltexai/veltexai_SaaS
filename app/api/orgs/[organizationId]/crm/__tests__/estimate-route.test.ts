import { NextRequest } from 'next/server';
import { defaultJob } from '@/features/service-catalog/catalog';
import { estimateJob } from '@/features/service-catalog/pricing';

const createClient = jest.fn();
jest.mock('@/lib/supabase/server', () => ({ createClient }));
const ORG='11111111-1111-4111-8111-111111111111', USER='33333333-3333-4333-8333-333333333333';
const OPP='44444444-4444-4444-8444-444444444444', PROPERTY='55555555-5555-4555-8555-555555555555';
const PACKAGE='66666666-6666-4666-8666-666666666666';
function chain(result:unknown){const q:any={};for(const m of ['select','eq','maybeSingle'])q[m]=jest.fn().mockReturnValue(q);q.maybeSingle.mockResolvedValue(result);return q;}
function client(role='estimator',result:any={data:[{estimate_run_id:'77777777-7777-4777-8777-777777777777',replayed:false}],error:null}){
  const rpc=jest.fn().mockResolvedValue(result);createClient.mockResolvedValue({auth:{getUser:jest.fn().mockResolvedValue({data:{user:{id:USER}},error:null})},from:jest.fn().mockReturnValue(chain({data:{role},error:null})),rpc});return rpc;
}
const job=defaultJob('recurring_standard');
function req(body:any={propertyId:PROPERTY,workPackageId:PACKAGE,expectedPackageUpdatedAt:'2026-10-03T08:00:00.000Z',selectedScenario:'base',pricingBasis:'per_visit',job},key='estimate-key-1'){
  return new NextRequest('http://local/estimate',{method:'POST',headers:{'content-type':'application/json',...(key?{'idempotency-key':key}:{})},body:JSON.stringify(body)});
}
const context={params:Promise.resolve({organizationId:ORG,opportunityId:OPP})};

describe('R3-3 estimate route',()=>{
  beforeEach(()=>jest.clearAllMocks());
  it('computes with the shared deterministic engine and sends one caller-bound command',async()=>{
    const rpc=client();const {POST}=await import('../opportunities/[opportunityId]/estimates/route');
    expect((await POST(req(),context)).status).toBe(201);
    const output=estimateJob(job);
    expect(rpc).toHaveBeenCalledWith('command_crm_estimate_run',expect.objectContaining({
      p_organization:ORG,p_opportunity:OPP,p_package:PACKAGE,p_property:PROPERTY,
      p_engine_key:'service_catalog',p_engine_version:'2026-09-22.2',p_input_snapshot:job,
      p_output_snapshot:output,p_selected_scenario:'base',
      p_selected_amount_minor:Math.round(output.base.suggestedPrice*100),p_currency:'USD',
    }));
  });
  it('rejects viewers, missing retry keys, mismatched package tokens, and invalid overrides before RPC',async()=>{
    let rpc=client('viewer');const {POST}=await import('../opportunities/[opportunityId]/estimates/route');
    expect((await POST(req(),context)).status).toBe(404);expect(rpc).not.toHaveBeenCalled();
    rpc=client();expect((await POST(req(undefined,''),context)).status).toBe(400);expect(rpc).not.toHaveBeenCalled();
    rpc=client();expect((await POST(req({...JSON.parse(await req().text()),expectedPackageUpdatedAt:null}),context)).status).toBe(400);expect(rpc).not.toHaveBeenCalled();
    rpc=client();expect((await POST(req({...JSON.parse(await req().text()),selectedScenario:'override'}),context)).status).toBe(400);expect(rpc).not.toHaveBeenCalled();
  });
  it.each([['42501',404],['40001',409],['23514',422],['22P02',422],['XX000',503]])('maps %s without leaking details',async(code,status)=>{
    client('admin',{data:null,error:{code,message:'private detail'}});const {POST}=await import('../opportunities/[opportunityId]/estimates/route');
    const response=await POST(req(),context);expect(response.status).toBe(status);expect(JSON.stringify(await response.json())).not.toContain('private detail');
  });
});

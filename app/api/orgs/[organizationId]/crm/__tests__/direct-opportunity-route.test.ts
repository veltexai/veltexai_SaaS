import { NextRequest } from 'next/server';
const createClient=jest.fn();jest.mock('@/lib/supabase/server',()=>({createClient}));
const ORG='11111111-1111-4111-8111-111111111111',USER='22222222-2222-4222-8222-222222222222';
const OPP='33333333-3333-4333-8333-333333333333',LEAD='44444444-4444-4444-8444-444444444444';
const CUSTOMER='55555555-5555-4555-8555-555555555555',PROPERTY='66666666-6666-4666-8666-666666666666',PIPELINE='77777777-7777-4777-8777-777777777777';
function client(role:string,data:unknown=[{opportunity_id:OPP,lead_id:LEAD,replayed:false}],error:unknown=null){const q:any={};for(const m of ['select','eq'])q[m]=jest.fn().mockReturnValue(q);q.maybeSingle=jest.fn().mockResolvedValue({data:{role},error:null});const rpc=jest.fn().mockResolvedValue({data,error});createClient.mockResolvedValue({auth:{getUser:jest.fn().mockResolvedValue({data:{user:{id:USER}},error:null})},from:jest.fn().mockReturnValue(q),rpc});return rpc;}
const context={params:Promise.resolve({organizationId:ORG})};
function request(body:unknown){return new NextRequest('http://local/direct',{method:'POST',headers:{'content-type':'application/json','idempotency-key':'direct-opportunity-0001'},body:JSON.stringify(body)});}
const body={opportunityId:OPP,leadId:LEAD,customerId:CUSTOMER,propertyId:PROPERTY,pipelineId:PIPELINE,name:'North Campus',ownerUserId:USER,estimatorUserId:USER};
describe('R3-1 direct opportunity route',()=>{beforeEach(()=>jest.clearAllMocks());
  it('creates an opportunity and hidden attribution lead atomically',async()=>{const rpc=client('estimator');const {POST}=await import('../opportunities/direct/route');expect((await POST(request(body),context)).status).toBe(201);expect(rpc).toHaveBeenCalledWith('create_crm_direct_opportunity',expect.objectContaining({p_organization:ORG,p_opportunity:OPP,p_lead:LEAD,p_customer:CUSTOMER,p_property:PROPERTY,p_owner:USER}));});
  it('denies viewers before the RPC',async()=>{const rpc=client('viewer');const {POST}=await import('../opportunities/direct/route');expect((await POST(request(body),context)).status).toBe(404);expect(rpc).not.toHaveBeenCalled();});
});

import { NextRequest } from 'next/server';
const createClient = jest.fn(); jest.mock('@/lib/supabase/server', () => ({ createClient }));
const ORG='11111111-1111-4111-8111-111111111111', USER='22222222-2222-4222-8222-222222222222';
const OPP='33333333-3333-4333-8333-333333333333', RESPONSE='44444444-4444-4444-8444-444444444444', REASON='55555555-5555-4555-8555-555555555555';
function client(role:string,data:unknown=[{response_id:RESPONSE,replayed:false}],error:unknown=null){const q:any={};for(const m of ['select','eq'])q[m]=jest.fn().mockReturnValue(q);q.maybeSingle=jest.fn().mockResolvedValue({data:{role},error:null});const rpc=jest.fn().mockResolvedValue({data,error});createClient.mockResolvedValue({auth:{getUser:jest.fn().mockResolvedValue({data:{user:{id:USER}},error:null})},from:jest.fn().mockReturnValue(q),rpc});return rpc;}
const context={params:Promise.resolve({organizationId:ORG,opportunityId:OPP})};
function request(body:unknown,key='qualify-0001'){return new NextRequest('http://local/qualification',{method:'POST',headers:{'content-type':'application/json','idempotency-key':key},body:JSON.stringify(body)});}
describe('R3-1 qualification route',()=>{beforeEach(()=>jest.clearAllMocks());
  it('records not-fit with a reason through one command',async()=>{const rpc=client('estimator');const {POST}=await import('../opportunities/[opportunityId]/qualification/route');const response=await POST(request({responseId:RESPONSE,outcome:'not_fit',operatorNotes:'Outside service area',lossReasonId:REASON}),context);expect(response.status).toBe(201);expect(rpc).toHaveBeenCalledWith('qualify_crm_opportunity',expect.objectContaining({p_response:RESPONSE,p_request_key:'qualify-0001',p_outcome:'not_fit',p_loss_reason:REASON,p_checklist_version:'operator_v1_unvalidated'}));});
  it('requires a reason for not-fit before RPC',async()=>{const rpc=client('owner');const {POST}=await import('../opportunities/[opportunityId]/qualification/route');expect((await POST(request({responseId:RESPONSE,outcome:'not_fit'}),context)).status).toBe(400);expect(rpc).not.toHaveBeenCalled();});
  it('denies viewers',async()=>{const rpc=client('viewer');const {POST}=await import('../opportunities/[opportunityId]/qualification/route');expect((await POST(request({responseId:RESPONSE,outcome:'fit'}),context)).status).toBe(404);expect(rpc).not.toHaveBeenCalled();});
});

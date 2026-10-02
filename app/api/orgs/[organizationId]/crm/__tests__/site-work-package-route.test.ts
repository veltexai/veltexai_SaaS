import { NextRequest } from 'next/server';
const createClient = jest.fn(); jest.mock('@/lib/supabase/server', () => ({ createClient }));
const ORG='11111111-1111-4111-8111-111111111111', USER='22222222-2222-4222-8222-222222222222';
const OPP='33333333-3333-4333-8333-333333333333', PACKAGE='44444444-4444-4444-8444-444444444444';
const PROPERTY='55555555-5555-4555-8555-555555555555', WALK='66666666-6666-4666-8666-666666666666';
function client(role:string,data:unknown=[{package_id:PACKAGE,created:true,replayed:false,updated_at:'2026-10-02T00:00:00Z'}],error:unknown=null){const q:any={};for(const m of ['select','eq'])q[m]=jest.fn().mockReturnValue(q);q.maybeSingle=jest.fn().mockResolvedValue({data:{role},error:null});const rpc=jest.fn().mockResolvedValue({data,error});createClient.mockResolvedValue({auth:{getUser:jest.fn().mockResolvedValue({data:{user:{id:USER}},error:null})},from:jest.fn().mockReturnValue(q),rpc});return rpc;}
const context={params:Promise.resolve({organizationId:ORG,opportunityId:OPP,packageId:PACKAGE})};
function request(body:unknown){return new NextRequest('http://local/package',{method:'PUT',headers:{'content-type':'application/json','idempotency-key':'package-command-0001'},body:JSON.stringify(body)});}
describe('R3-1 site work package route',()=>{beforeEach(()=>jest.clearAllMocks());
  it('creates a scoped walkthrough package',async()=>{const rpc=client('estimator');const {PUT}=await import('../opportunities/[opportunityId]/packages/[packageId]/route');const response=await PUT(request({propertyId:PROPERTY,status:'walkthrough_scheduled',walkthroughId:WALK}),context);expect(response.status).toBe(201);expect(rpc).toHaveBeenCalledWith('save_crm_site_work_package',expect.objectContaining({p_organization:ORG,p_opportunity:OPP,p_package:PACKAGE,p_property:PROPERTY,p_status:'walkthrough_scheduled',p_walkthrough:WALK}));});
  it('requires state evidence before RPC',async()=>{const rpc=client('owner');const {PUT}=await import('../opportunities/[opportunityId]/packages/[packageId]/route');expect((await PUT(request({propertyId:PROPERTY,status:'accepted'}),context)).status).toBe(400);expect(rpc).not.toHaveBeenCalled();});
  it('maps an optimistic concurrency conflict safely',async()=>{client('admin',null,{code:'40001'});const {PUT}=await import('../opportunities/[opportunityId]/packages/[packageId]/route');expect((await PUT(request({propertyId:PROPERTY,status:'scoping'}),context)).status).toBe(409);});
  it('denies viewers',async()=>{const rpc=client('viewer');const {PUT}=await import('../opportunities/[opportunityId]/packages/[packageId]/route');expect((await PUT(request({propertyId:PROPERTY,status:'scoping'}),context)).status).toBe(404);expect(rpc).not.toHaveBeenCalled();});
});

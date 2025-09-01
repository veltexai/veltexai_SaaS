const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Read environment variables from .env.local
const envContent = fs.readFileSync('.env.local', 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) {
    envVars[key.trim()] = value.trim();
  }
});

const supabase = createClient(
  envVars.NEXT_PUBLIC_SUPABASE_URL,
  envVars.SUPABASE_SERVICE_ROLE_KEY
);

async function testStorage() {
  console.log('Testing Supabase storage...');
  console.log('URL:', envVars.NEXT_PUBLIC_SUPABASE_URL);
  console.log('Service Role Key exists:', !!envVars.SUPABASE_SERVICE_ROLE_KEY);
  
  try {
    // List all buckets
    console.log('\n1. Listing all buckets:');
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    if (bucketsError) {
      console.error('Error listing buckets:', bucketsError);
    } else {
      console.log('Buckets:', buckets);
    }
    
    // Check if profile-logos bucket exists
    console.log('\n2. Checking profile-logos bucket:');
    const profileBucket = buckets?.find(b => b.name === 'profile-logos');
    if (profileBucket) {
      console.log('Profile-logos bucket found:', profileBucket);
    } else {
      console.log('Profile-logos bucket NOT found');
    }
    
    // List objects in profile-logos bucket
    console.log('\n3. Listing objects in profile-logos bucket:');
    const { data: objects, error: objectsError } = await supabase.storage
      .from('profile-logos')
      .list('', { limit: 100 });
    
    if (objectsError) {
      console.error('Error listing objects:', objectsError);
    } else {
      console.log('Objects in profile-logos:', objects);
      console.log('Total objects:', objects?.length || 0);
    }
    
    // Test upload with a simple text file
    console.log('\n4. Testing upload:');
    const testContent = 'test-upload-' + Date.now();
    const testFileName = `test-${Date.now()}.txt`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('profile-logos')
      .upload(testFileName, testContent, {
        contentType: 'text/plain'
      });
    
    if (uploadError) {
      console.error('Upload error:', uploadError);
    } else {
      console.log('Upload successful:', uploadData);
      
      // Get public URL
      const { data: urlData } = supabase.storage
        .from('profile-logos')
        .getPublicUrl(testFileName);
      
      console.log('Public URL:', urlData.publicUrl);
      
      // Clean up test file
      await supabase.storage.from('profile-logos').remove([testFileName]);
      console.log('Test file cleaned up');
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testStorage();
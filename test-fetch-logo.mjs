async function test() {
  try {
    const res = await fetch("https://bunnclexcjutrltuybam.supabase.co/storage/v1/object/public/logos/nf7kazbc1a.jpg");
    console.log("Status:", res.status);
    console.log("Content-Type:", res.headers.get("content-type"));
    const text = await res.text();
    console.log("Response Text:", text.substring(0, 200));
  } catch (err) {
    console.error("Fetch error:", err);
  }
}
test();

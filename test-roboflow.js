

async function test() {
    const imageUrl = "https://images.unsplash.com/photo-1547683905-f686c993aae5?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"; // A sample image of a flood
    try {
        console.log('Sending request to Roboflow...');
        const response = await fetch('https://infer.roboflow.com/clip/compare?api_key=21IpOwYOPyTyHWw6in1p', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                subject: { type: "url", value: imageUrl },
                subject_type: "image",
                prompt: ["flood", "fire", "normal"]
            })
        });
        
        console.log(`Status: ${response.status}`);
        if (!response.ok) {
            console.log(await response.text());
        } else {
            const data = await response.json();
            console.log(JSON.stringify(data, null, 2));
        }
    } catch (e) {
        console.error(e);
    }
}

test();

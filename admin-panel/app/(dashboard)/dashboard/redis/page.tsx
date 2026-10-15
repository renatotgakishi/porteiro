"use client";


export default function RedisPage() {

    //const grafanaTheme = theme === "light" ? "light" : "dark";

    return (
        <div className="h-screen w-full">
            <iframe
                src="http://localhost:5540/5da8a2a7-0cf1-4ca6-83d0-fee4c9fc84e5/browser"
                className="w-full h-full border-0"
            />
        </div>
    );
}




"use client"; // marks the file as a client component, runs in the browser

import { useState, useEffect } from "react"; // useState lets a component remember a value and re render when it changes and useEffect runs code at specific times

export default function Watchlist() {

    const [tickers, setTickers] = useState <string[]>([]) // tickers is current value (the list of watchlist tickers), and setTickers is what you call to change it (triggering a rerender),  <string[]>([])  creates a state variable starting as an empty array of strings.

    useEffect(() => {
        const saved = localStorage.getItem("watchlist");
        if (saved) setTickers(JSON.parse(saved));
    }, []);    // [] at the end means run this once when the component firs tappears
    
    return <div> { /*your wathclist ui here */}</div>
}




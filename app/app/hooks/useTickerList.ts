"use client"; // browser side code, client component only

import { useEffect, useState } from "react"; // useState holds data that can change and re renders UI, useEffect runs side effects like localStorage

export function useTickerList(storageKey: string, initial: string[] = []) { // custom hook is a func whos name starts with use, takes a storageKey "holdings" or "watchlist" and an optional starting array

    const [tickers, setTickers] = useState<string[]>(initial); // tickers is the current array, setTickers is how you change it. when you call setTickers, react re renders every component using the data
    // string tells react that the state value is an array of strings. initial is the arg, the value tickers will start as. returns a tuple, [value, setterFunction]
    const [loaded, setLoaded] = useState(false); // have we read local storage yet?

    useEffect(() => {
        const saved = localStorage.getItem(storageKey);
        if (saved) setTickers(JSON.parse(saved));
        setLoaded(true);
    }, [storageKey]);

    useEffect(() => {
        if (loaded) localStorage.setItem(storageKey, JSON.stringify(tickers));
    }, [tickers, loaded, storageKey]);

}

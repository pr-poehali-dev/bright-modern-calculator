import { useState, useEffect, useCallback, useRef } from "react";

type Tab = "calc" | "converter" | "percent" | "credit" | "bmi" | "dates" | "history";
type Theme = "dark" | "light";
type ColorScheme = "purple" | "cyan" | "green" | "orange";

interface HistoryItem {
  expression: string;
  result: string;
  time: string;
}

interface ConfettiPiece {
  id: number;
  x: number;
  color: string;
  rotation: number;
  size: number;
  delay: number;
}

const COLOR_SCHEMES: Record<ColorScheme, { a: string; b: string; c: string; glow: string; btn: string }> = {
  purple: { a: "#7c3aed", b: "#db2777", c: "#f97316", glow: "rgba(124,58,237,0.55)", btn: "rgba(124,58,237,0.22)" },
  cyan:   { a: "#0891b2", b: "#6366f1", c: "#8b5cf6", glow: "rgba(8,145,178,0.55)",  btn: "rgba(8,145,178,0.22)" },
  green:  { a: "#059669", b: "#0891b2", c: "#6366f1", glow: "rgba(5,150,105,0.55)",  btn: "rgba(5,150,105,0.22)" },
  orange: { a: "#ea580c", b: "#dc2626", c: "#9333ea", glow: "rgba(234,88,12,0.55)",  btn: "rgba(234,88,12,0.22)" },
};

export default function Index() {
  const [tab, setTab] = useState<Tab>("calc");
  const [theme, setTheme] = useState<Theme>(() =>
    (localStorage.getItem("calc_theme") as Theme) || "dark"
  );
  const [colorScheme, setColorScheme] = useState<ColorScheme>(() =>
    (localStorage.getItem("calc_color") as ColorScheme) || "purple"
  );
  const [expression, setExpression] = useState("");
  const [display, setDisplay] = useState("0");
  const [justCalculated, setJustCalculated] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>(() => {
    try { return JSON.parse(localStorage.getItem("calc_history") || "[]"); } catch { return []; }
  });
  const [confetti, setConfetti] = useState<ConfettiPiece[]>([]);
  const [copied, setCopied] = useState(false);
  const [favorites, setFavorites] = useState<HistoryItem[]>(() => {
    try { return JSON.parse(localStorage.getItem("calc_favorites") || "[]"); } catch { return []; }
  });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 480);

  // Converter state
  const [convType, setConvType] = useState<"length" | "weight" | "temp" | "currency">("currency");
  const [convFrom, setConvFrom] = useState("");
  const [convFromUnit, setConvFromUnit] = useState("USD");
  const [convToUnit, setConvToUnit] = useState("RUB");
  const [convResult, setConvResult] = useState("");

  // Percent state
  const [pMode, setPMode] = useState<"discount" | "markup" | "vat">("discount");
  const [pBase, setPBase] = useState("");
  const [pPct, setPPct] = useState("");
  const [pResult, setPResult] = useState<{ label: string; value: string }[]>([]);

  // Credit state
  const [crAmount, setCrAmount] = useState("");
  const [crRate, setCrRate] = useState("");
  const [crMonths, setCrMonths] = useState("");
  const [crResult, setCrResult] = useState<{ monthly: string; total: string; overpay: string } | null>(null);

  // BMI state
  const [bmiWeight, setBmiWeight] = useState("");
  const [bmiHeight, setBmiHeight] = useState("");
  const [bmiAge, setBmiAge] = useState("");
  const [bmiGender, setBmiGender] = useState<"m" | "f">("m");
  const [bmiResult, setBmiResult] = useState<{ bmi: string; category: string; color: string; tip: string } | null>(null);

  // Dates state
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [datesResult, setDatesResult] = useState<{ days: number; weeks: number; months: number; years: number; workdays: number } | null>(null);

  const audioCtx = useRef<AudioContext | null>(null);
  const cs = COLOR_SCHEMES[colorScheme];
  const isDark = theme === "dark";

  // Persist settings & data
  useEffect(() => { localStorage.setItem("calc_history", JSON.stringify(history)); }, [history]);
  useEffect(() => { localStorage.setItem("calc_favorites", JSON.stringify(favorites)); }, [favorites]);
  useEffect(() => { localStorage.setItem("calc_theme", theme); }, [theme]);
  useEffect(() => { localStorage.setItem("calc_color", colorScheme); }, [colorScheme]);

  // Responsive
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 480);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const playClick = useCallback(() => {
    try {
      if (!audioCtx.current) audioCtx.current = new AudioContext();
      const ctx = audioCtx.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(900, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(450, ctx.currentTime + 0.07);
      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.09);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } catch (_e) { /* audio not supported */ }
  }, []);

  const spawnConfetti = useCallback(() => {
    const colors = [cs.a, cs.b, cs.c, "#ffffff", "#fbbf24", "#34d399"];
    const items: ConfettiPiece[] = Array.from({ length: 50 }, (_, i) => ({
      id: Date.now() + i,
      x: 10 + Math.random() * 80,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * 360,
      size: 6 + Math.random() * 8,
      delay: Math.random() * 0.5,
    }));
    setConfetti(items);
    setTimeout(() => setConfetti([]), 3500);
  }, [cs]);

  const addToHistory = useCallback((expr: string, result: string) => {
    const num = parseFloat(result);
    if (!isNaN(num) && Number.isFinite(num) && num !== 0 && num % 100 === 0) {
      spawnConfetti();
    }
    setHistory(prev => [{
      expression: expr,
      result,
      time: new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }),
    }, ...prev].slice(0, 10));
  }, [spawnConfetti]);

  const press = useCallback((val: string) => {
    playClick();
    if (val === "C") { setDisplay("0"); setExpression(""); setJustCalculated(false); return; }
    if (val === "⌫") {
      setDisplay(prev => prev.length > 1 ? prev.slice(0, -1) : "0");
      setExpression(prev => prev.slice(0, -1));
      return;
    }
    if (val === "=") {
      try {
        const fullExpr = expression + display;
        const sanitized = fullExpr
          .replace(/×/g, "*").replace(/÷/g, "/")
          .replace(/sin\(/g, "Math.sin(").replace(/cos\(/g, "Math.cos(")
          .replace(/tan\(/g, "Math.tan(").replace(/log\(/g, "Math.log10(")
          .replace(/ln\(/g, "Math.log(").replace(/√\(/g, "Math.sqrt(")
          .replace(/π/g, String(Math.PI)).replace(/\be\b/g, String(Math.E));
         
        const res = Function('"use strict"; return (' + sanitized + ')')();
        const resStr = Number.isFinite(res) ? String(parseFloat(res.toFixed(10))) : "Ошибка";
        addToHistory(fullExpr, resStr);
        setDisplay(resStr);
        setExpression("");
        setJustCalculated(true);
      } catch { setDisplay("Ошибка"); setExpression(""); setJustCalculated(false); }
      return;
    }

    const ops = ["+", "-", "×", "÷", "%"];
    if (ops.includes(val)) {
      setExpression(justCalculated ? display + val : expression + display + val);
      setDisplay("0");
      setJustCalculated(false);
      return;
    }

    const fns = ["sin(", "cos(", "tan(", "log(", "ln(", "√("];
    if (fns.includes(val)) {
      setExpression(prev => prev + (display !== "0" ? display : "") + val);
      setDisplay("0");
      setJustCalculated(false);
      return;
    }

    if (val === "π") {
      setDisplay(String(parseFloat(Math.PI.toFixed(8))));
      setJustCalculated(false);
      return;
    }
    if (val === "e") {
      setDisplay(String(parseFloat(Math.E.toFixed(8))));
      setJustCalculated(false);
      return;
    }
    if (val === "x²") {
      const n = parseFloat(display);
      const r = String(n * n);
      addToHistory(display + "²", r);
      setDisplay(r); setJustCalculated(true); return;
    }
    if (val === "x³") {
      const n = parseFloat(display);
      const r = String(n * n * n);
      addToHistory(display + "³", r);
      setDisplay(r); setJustCalculated(true); return;
    }
    if (val === "(") { setExpression(prev => prev + "("); return; }
    if (val === ")") { setDisplay(prev => prev === "0" ? ")" : prev + ")"); return; }

    if (justCalculated) { setDisplay(val === "." ? "0." : val); setJustCalculated(false); return; }
    if (val === "." && display.includes(".")) return;
    setDisplay(prev => prev === "0" && val !== "." ? val : prev + val);
  }, [display, expression, justCalculated, addToHistory, playClick]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const map: Record<string, string> = {
        "0":"0","1":"1","2":"2","3":"3","4":"4","5":"5","6":"6","7":"7","8":"8","9":"9",
        ".":".","Enter":"=","=":"=","Backspace":"⌫","Escape":"C",
        "+":"+","-":"-","*":"×","/":"÷","%":"%","(":"(",")":")","p":"π",
      };
      if (map[e.key]) { e.preventDefault(); press(map[e.key]); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [press]);

  const copyResult = () => {
    navigator.clipboard.writeText(display);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) { document.documentElement.requestFullscreen(); setIsFullscreen(true); }
    else { document.exitFullscreen(); setIsFullscreen(false); }
  };

  // Converter
  const convUnits: Record<string, string[]> = {
    currency: ["RUB","USD","EUR","CNY","GBP"],
    length: ["м","км","см","мм","дюйм","фут","миля"],
    weight: ["кг","г","т","фунт","унция"],
    temp: ["°C","°F","K"],
  };

  const convert = () => {
    const v = parseFloat(convFrom);
    if (isNaN(v)) { setConvResult("Введите число"); return; }
    let res = 0;
    if (convType === "currency") {
      const rates: Record<string, number> = { RUB: 1, USD: 90, EUR: 97, CNY: 12.5, GBP: 113 };
      res = (v * (rates[convFromUnit] || 1)) / (rates[convToUnit] || 1);
    } else if (convType === "length") {
      const toM: Record<string, number> = { м:1, км:1000, см:0.01, мм:0.001, дюйм:0.0254, фут:0.3048, миля:1609.34 };
      res = (v * (toM[convFromUnit] || 1)) / (toM[convToUnit] || 1);
    } else if (convType === "weight") {
      const toKg: Record<string, number> = { кг:1, г:0.001, т:1000, фунт:0.4536, унция:0.02835 };
      res = (v * (toKg[convFromUnit] || 1)) / (toKg[convToUnit] || 1);
    } else {
      if (convFromUnit === "°C" && convToUnit === "°F") res = v * 9/5 + 32;
      else if (convFromUnit === "°F" && convToUnit === "°C") res = (v - 32) * 5/9;
      else if (convFromUnit === "°C" && convToUnit === "K") res = v + 273.15;
      else if (convFromUnit === "K" && convToUnit === "°C") res = v - 273.15;
      else if (convFromUnit === "°F" && convToUnit === "K") res = (v - 32) * 5/9 + 273.15;
      else if (convFromUnit === "K" && convToUnit === "°F") res = (v - 273.15) * 9/5 + 32;
      else res = v;
    }
    setConvResult(parseFloat(res.toFixed(6)).toString());
  };

  // Percent
  const calcPercent = () => {
    const base = parseFloat(pBase), pct = parseFloat(pPct);
    if (isNaN(base) || isNaN(pct)) { setPResult([{ label: "Ошибка", value: "Введите числа" }]); return; }
    if (pMode === "discount") {
      const disc = base * pct / 100;
      setPResult([
        { label: "Скидка", value: disc.toLocaleString("ru-RU", { minimumFractionDigits: 2 }) + " ₽" },
        { label: "Итого к оплате", value: (base - disc).toLocaleString("ru-RU", { minimumFractionDigits: 2 }) + " ₽" },
      ]);
    } else if (pMode === "markup") {
      const mark = base * pct / 100;
      setPResult([
        { label: "Наценка", value: mark.toLocaleString("ru-RU", { minimumFractionDigits: 2 }) + " ₽" },
        { label: "Цена с наценкой", value: (base + mark).toLocaleString("ru-RU", { minimumFractionDigits: 2 }) + " ₽" },
      ]);
    } else {
      const vat = base * pct / 100;
      setPResult([
        { label: `НДС ${pct}%`, value: vat.toLocaleString("ru-RU", { minimumFractionDigits: 2 }) + " ₽" },
        { label: "Сумма с НДС", value: (base + vat).toLocaleString("ru-RU", { minimumFractionDigits: 2 }) + " ₽" },
        { label: "Сумма без НДС (из суммы)", value: (base / (1 + pct / 100)).toLocaleString("ru-RU", { minimumFractionDigits: 2 }) + " ₽" },
      ]);
    }
  };

  // Credit
  const calcCredit = () => {
    const S = parseFloat(crAmount), r = parseFloat(crRate) / 100 / 12, n = parseInt(crMonths);
    if (isNaN(S) || isNaN(r) || isNaN(n) || n <= 0) { setCrResult(null); return; }
    const monthly = r === 0 ? S / n : S * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);
    const total = monthly * n;
    setCrResult({ monthly: monthly.toFixed(2), total: total.toFixed(2), overpay: (total - S).toFixed(2) });
  };

  // BMI
  const calcBmi = () => {
    const w = parseFloat(bmiWeight), h = parseFloat(bmiHeight) / 100;
    if (isNaN(w) || isNaN(h) || h <= 0) { setBmiResult(null); return; }
    const bmi = w / (h * h);
    let category = "", color = "", tip = "";
    if (bmi < 16)        { category = "Выраженный дефицит"; color = "#60a5fa"; tip = "Срочно обратитесь к врачу"; }
    else if (bmi < 18.5) { category = "Недостаточный вес";  color = "#93c5fd"; tip = "Стоит увеличить калорийность рациона"; }
    else if (bmi < 25)   { category = "Норма ✓";            color = "#34d399"; tip = "Отличный результат, так держать!"; }
    else if (bmi < 30)   { category = "Избыточный вес";     color = "#fbbf24"; tip = "Рекомендуется умеренная физическая активность"; }
    else if (bmi < 35)   { category = "Ожирение I степени"; color = "#f97316"; tip = "Проконсультируйтесь с врачом"; }
    else if (bmi < 40)   { category = "Ожирение II степени";color = "#ef4444"; tip = "Необходима консультация специалиста"; }
    else                 { category = "Ожирение III степени";color = "#dc2626"; tip = "Срочно обратитесь к врачу"; }
    const age = parseInt(bmiAge);
    let norm = "18.5 – 24.9";
    if (!isNaN(age) && age >= 65) norm = "23 – 27";
    else if (!isNaN(age) && age >= 45) norm = "22 – 27";
    setBmiResult({ bmi: bmi.toFixed(1), category, color, tip: tip + (norm ? ` · Норма для вашего возраста: ${norm}` : "") });
  };

  // Dates
  const calcDates = () => {
    if (!dateFrom || !dateTo) { setDatesResult(null); return; }
    const d1 = new Date(dateFrom), d2 = new Date(dateTo);
    if (isNaN(d1.getTime()) || isNaN(d2.getTime())) { setDatesResult(null); return; }
    const [start, end] = d1 <= d2 ? [d1, d2] : [d2, d1];
    const diffMs = end.getTime() - start.getTime();
    const days = Math.round(diffMs / 86400000);
    const weeks = Math.floor(days / 7);
    const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
    const years = end.getFullYear() - start.getFullYear() - (end < new Date(start.getFullYear() + (end.getFullYear() - start.getFullYear()), start.getMonth(), start.getDate()) ? 1 : 0);
    let workdays = 0;
    const cur = new Date(start);
    while (cur <= end) { const d = cur.getDay(); if (d !== 0 && d !== 6) workdays++; cur.setDate(cur.getDate() + 1); }
    setDatesResult({ days, weeks, months: Math.abs(months), years: Math.abs(years), workdays });
  };

  // Styles
  const glassBg = isDark ? "rgba(15,10,35,0.78)" : "rgba(255,255,255,0.68)";
  const glassBorder = isDark ? "1px solid rgba(255,255,255,0.11)" : "1px solid rgba(255,255,255,0.85)";
  const textColor = isDark ? "#f1f0ff" : "#1e1b4b";
  const subText = isDark ? "rgba(200,190,255,0.5)" : "rgba(30,27,75,0.45)";

  const inputStyle: React.CSSProperties = {
    background: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.05)",
    border: isDark ? "1px solid rgba(255,255,255,0.13)" : "1px solid rgba(0,0,0,0.1)",
    borderRadius: "12px", padding: "12px 16px", color: textColor,
    fontFamily: "'Montserrat', sans-serif", fontSize: "1rem", width: "100%",
    outline: "none", boxSizing: "border-box",
  };

  const resultCard: React.CSSProperties = {
    background: `linear-gradient(135deg, ${cs.a}1a, ${cs.b}1a)`,
    border: `1px solid ${cs.a}44`, borderRadius: "14px", padding: "14px 16px",
  };

  const primaryBtn: React.CSSProperties = {
    background: `linear-gradient(135deg, ${cs.a}, ${cs.b})`,
    border: "none", borderRadius: "14px", padding: "14px",
    color: "#fff", fontFamily: "'Montserrat', sans-serif", fontWeight: 700,
    fontSize: "1rem", cursor: "pointer", boxShadow: `0 6px 24px ${cs.glow}`,
    width: "100%", transition: "all 0.2s",
  };

  const calcBtnStyle = (v: string): React.CSSProperties => {
    const isOp = ["+", "-", "×", "÷"].includes(v);
    const isEq = v === "=";
    const isClear = v === "C";
    const isSci = ["sin(","cos(","tan(","log(","ln(","√(","x²","x³","π","e","(",")","%"].includes(v);
    const btnH = isMobile ? "64px" : "56px";
    const base: React.CSSProperties = {
      cursor: "pointer", border: "none", outline: "none",
      fontFamily: "'Montserrat', sans-serif", fontWeight: 600,
      borderRadius: isMobile ? "16px" : "14px", height: btnH, width: "100%",
      transition: "all 0.15s ease", userSelect: "none",
      fontSize: isSci ? (isMobile ? "0.82rem" : "0.78rem") : (isMobile ? "1.1rem" : "1rem"),
      WebkitTapHighlightColor: "transparent", touchAction: "manipulation",
    };
    if (isEq) return { ...base, background: `linear-gradient(135deg, ${cs.a}, ${cs.b})`, color: "#fff", boxShadow: `0 4px 20px ${cs.glow}`, fontSize: isMobile ? "1.3rem" : "1.2rem" };
    if (isClear) return { ...base, background: "rgba(239,68,68,0.2)", color: "#f87171", border: "1px solid rgba(239,68,68,0.3)" };
    if (v === "⌫") return { ...base, background: "rgba(239,68,68,0.12)", color: "#fca5a5", border: "1px solid rgba(239,68,68,0.2)", fontSize: isMobile ? "1.2rem" : "1.1rem" };
    if (isOp) return { ...base, background: cs.btn, color: cs.a, border: `1px solid ${cs.a}55`, fontSize: isMobile ? "1.3rem" : "1.2rem" };
    if (isSci) return { ...base, background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)", color: isDark ? "#c4b5fd" : "#6d28d9", border: isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(109,40,217,0.2)" };
    return { ...base, background: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)", color: textColor, border: isDark ? "1px solid rgba(255,255,255,0.09)" : "1px solid rgba(0,0,0,0.09)" };
  };

  const tabs = [
    { id: "calc" as Tab, label: "Основной", icon: "🔢" },
    { id: "converter" as Tab, label: "Конвертер", icon: "🔄" },
    { id: "percent" as Tab, label: "Проценты", icon: "%" },
    { id: "credit" as Tab, label: "Кредит", icon: "🏦" },
    { id: "bmi" as Tab, label: "ИМТ", icon: "⚖️" },
    { id: "dates" as Tab, label: "Даты", icon: "📅" },
    { id: "history" as Tab, label: "История", icon: "📋" },
  ];

  const calcButtons = [
    ["C", "(", ")", "⌫"],
    ["sin(", "cos(", "tan(", "÷"],
    ["log(", "ln(", "√(", "×"],
    ["x²", "x³", "π", "-"],
    ["7", "8", "9", "+"],
    ["4", "5", "6", "%"],
    ["1", "2", "3", "="],
    ["0", ".", "e", "="],
  ];

  // Flatten + dedupe "=" (keep last)
  const flatBtns = calcButtons.flat();
  const eqIndexes = flatBtns.reduce<number[]>((a, v, i) => v === "=" ? [...a, i] : a, []);
  const lastEq = eqIndexes[eqIndexes.length - 1];
  const displayBtns = flatBtns.filter((v, i) => v !== "=" || i === lastEq);

  return (
    <div style={{
      minHeight: "100vh", minHeight: "100dvh",
      background: isDark
        ? "linear-gradient(135deg, #0b0718 0%, #160825 30%, #0d1640 65%, #140820 100%)"
        : "linear-gradient(135deg, #ede9fe 0%, #fce7f3 45%, #ffedd5 100%)",
      fontFamily: "'Montserrat', sans-serif",
      display: "flex", flexDirection: "column", alignItems: "center",
      padding: isMobile ? "12px 10px env(safe-area-inset-bottom, 20px)" : "20px 16px 60px",
      paddingTop: isMobile ? "max(12px, env(safe-area-inset-top, 12px))" : "20px",
      position: "relative", overflow: "hidden",
    } as React.CSSProperties}>

      {/* Background orbs */}
      {[
        { l: "5%",  t: "5%",  s: 500, c: cs.a },
        { l: "65%", t: "15%", s: 380, c: cs.b },
        { l: "30%", t: "65%", s: 420, c: cs.c },
      ].map((o, i) => (
        <div key={i} style={{
          position: "fixed", left: o.l, top: o.t, width: o.s, height: o.s,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${o.c}2e 0%, transparent 68%)`,
          filter: "blur(50px)", pointerEvents: "none", zIndex: 0,
          animation: `orb${i} ${7 + i * 2}s ease-in-out infinite`,
        }} />
      ))}

      {/* Confetti */}
      {confetti.map(p => (
        <div key={p.id} style={{
          position: "fixed", left: `${p.x}%`, top: "-20px",
          width: p.size, height: p.size * 0.6,
          background: p.color, borderRadius: "2px",
          transform: `rotate(${p.rotation}deg)`,
          pointerEvents: "none", zIndex: 9999,
          animation: `cfall 3s ${p.delay}s ease-in forwards`,
        }} />
      ))}

      {/* Top controls */}
      <div style={{ display: "flex", gap: isMobile ? 6 : 8, marginBottom: isMobile ? 10 : 18, zIndex: 10, flexWrap: "wrap", justifyContent: "center", alignItems: "center" }}>
        <div style={{ display: "flex", gap: isMobile ? 8 : 6, alignItems: "center", background: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)", borderRadius: "20px", padding: isMobile ? "7px 14px" : "6px 12px" }}>
          {(Object.keys(COLOR_SCHEMES) as ColorScheme[]).map(sc => (
            <button key={sc} onClick={() => setColorScheme(sc)} title={sc} style={{
              width: isMobile ? 26 : 22, height: isMobile ? 26 : 22, borderRadius: "50%",
              border: colorScheme === sc ? `2px solid ${isDark ? "#fff" : "#1e1b4b"}` : "2px solid transparent",
              background: `linear-gradient(135deg, ${COLOR_SCHEMES[sc].a}, ${COLOR_SCHEMES[sc].b})`,
              cursor: "pointer", transition: "all 0.2s", padding: 0,
              WebkitTapHighlightColor: "transparent",
            }} />
          ))}
        </div>
        <button onClick={() => setTheme(t => t === "dark" ? "light" : "dark")} style={{
          background: isDark ? "rgba(255,255,255,0.09)" : "rgba(0,0,0,0.08)",
          border: isDark ? "1px solid rgba(255,255,255,0.15)" : "1px solid rgba(0,0,0,0.12)",
          borderRadius: "20px", padding: isMobile ? "7px 14px" : "6px 14px", cursor: "pointer",
          color: textColor, fontSize: isMobile ? "0.85rem" : "0.8rem", fontFamily: "'Montserrat', sans-serif", fontWeight: 600,
          WebkitTapHighlightColor: "transparent",
        }}>
          {isDark ? "☀️" : "🌙"}{!isMobile && (isDark ? " Светлая" : " Тёмная")}
        </button>
        {!isMobile && (
          <button onClick={toggleFullscreen} style={{
            background: isDark ? "rgba(255,255,255,0.09)" : "rgba(0,0,0,0.08)",
            border: isDark ? "1px solid rgba(255,255,255,0.15)" : "1px solid rgba(0,0,0,0.12)",
            borderRadius: "20px", padding: "6px 14px", cursor: "pointer",
            color: textColor, fontSize: "0.8rem", fontFamily: "'Montserrat', sans-serif", fontWeight: 600,
          }}>
            {isFullscreen ? "⊡ Выйти" : "⛶ На весь экран"}
          </button>
        )}
      </div>

      {/* Main card */}
      <div style={{
        background: glassBg, backdropFilter: "blur(28px)", WebkitBackdropFilter: "blur(28px)",
        border: glassBorder, borderRadius: isMobile ? "24px" : "28px",
        width: "100%", maxWidth: isMobile ? "100%" : 430,
        boxShadow: isDark
          ? `0 32px 80px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.04), 0 0 80px ${cs.glow}`
          : `0 24px 64px rgba(0,0,0,0.12), 0 0 0 1px rgba(255,255,255,0.7), 0 0 40px ${cs.glow}`,
        zIndex: 10, overflow: "hidden",
      }}>

        {/* Tabs */}
        <div style={{
          display: "flex", overflowX: "auto",
          padding: isMobile ? "10px 10px 0" : "14px 14px 0", gap: isMobile ? 4 : 5,
          scrollbarWidth: "none", WebkitOverflowScrolling: "touch",
        } as React.CSSProperties}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => { setTab(t.id); playClick(); }} style={{
              flexShrink: 0,
              background: tab === t.id
                ? `linear-gradient(135deg, ${cs.a}, ${cs.b})`
                : isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)",
              border: "none", borderRadius: "10px",
              padding: isMobile ? "8px 10px" : "7px 12px",
              color: tab === t.id ? "#fff" : textColor, cursor: "pointer",
              fontFamily: "'Montserrat', sans-serif", fontWeight: 700,
              fontSize: isMobile ? "0.72rem" : "0.7rem",
              transition: "all 0.2s", letterSpacing: "0.01em",
              boxShadow: tab === t.id ? `0 4px 14px ${cs.glow}` : "none",
              whiteSpace: "nowrap", WebkitTapHighlightColor: "transparent",
              touchAction: "manipulation",
            }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        <div style={{ padding: isMobile ? "10px" : "14px" }}>

          {/* ══ CALC ══ */}
          {tab === "calc" && (
            <div>
              {/* Display */}
              <div style={{
                background: isDark ? "rgba(0,0,0,0.4)" : "rgba(255,255,255,0.6)",
                borderRadius: "18px", padding: "16px 20px", marginBottom: 12,
                border: isDark ? "1px solid rgba(255,255,255,0.07)" : "1px solid rgba(0,0,0,0.07)",
                minHeight: 110,
              }}>
                <div style={{ color: subText, fontSize: "0.78rem", minHeight: "1.2em", textAlign: "right", marginBottom: 4, fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.02em" }}>
                  {expression || "\u00a0"}
                </div>
                <div style={{
                  color: textColor, textAlign: "right",
                  fontSize: display.length > 14 ? "1.5rem" : display.length > 9 ? "2rem" : "2.6rem",
                  fontWeight: 800, fontFamily: "'JetBrains Mono', monospace",
                  lineHeight: 1.15, wordBreak: "break-all",
                  textShadow: isDark ? `0 0 30px ${cs.glow}` : "none",
                }}>
                  {display}
                </div>
                <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", marginTop: 10 }}>
                  <button onClick={copyResult} style={{
                    background: "none", border: `1px solid ${isDark ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.13)"}`,
                    borderRadius: "8px", padding: "4px 10px", cursor: "pointer",
                    color: copied ? cs.a : subText, fontSize: "0.7rem", fontFamily: "'Montserrat', sans-serif",
                    fontWeight: 600, transition: "all 0.2s",
                  }}>
                    {copied ? "✓ Скопировано" : "📋 Копировать"}
                  </button>
                  <button onClick={() => {
                    if (display !== "0" && display !== "Ошибка") {
                      setFavorites(prev => [{
                        expression: expression || display,
                        result: display,
                        time: new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }),
                      }, ...prev].slice(0, 20));
                      playClick();
                    }
                  }} style={{
                    background: "none", border: `1px solid ${isDark ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.13)"}`,
                    borderRadius: "8px", padding: "4px 10px", cursor: "pointer",
                    color: subText, fontSize: "0.7rem", fontFamily: "'Montserrat', sans-serif", fontWeight: 600,
                  }}>
                    ★ Избранное
                  </button>
                </div>
              </div>

              {/* Button grid */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: isMobile ? 6 : 7 }}>
                {displayBtns.map((v, i) => (
                  <button key={i} onClick={() => press(v)}
                    style={calcBtnStyle(v)}
                    onMouseEnter={!isMobile ? e => {
                      (e.currentTarget as HTMLElement).style.transform = "translateY(-2px) scale(1.04)";
                      (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 24px ${cs.glow}`;
                    } : undefined}
                    onMouseLeave={!isMobile ? e => {
                      (e.currentTarget as HTMLElement).style.transform = "";
                      (e.currentTarget as HTMLElement).style.boxShadow = v === "=" ? `0 4px 20px ${cs.glow}` : "";
                    } : undefined}
                    onMouseDown={e => { (e.currentTarget as HTMLElement).style.transform = "scale(0.93)"; }}
                    onMouseUp={e => { (e.currentTarget as HTMLElement).style.transform = isMobile ? "scale(1)" : "translateY(-2px) scale(1.04)"; }}
                    onTouchStart={e => { (e.currentTarget as HTMLElement).style.transform = "scale(0.93)"; (e.currentTarget as HTMLElement).style.boxShadow = `0 4px 16px ${cs.glow}`; }}
                    onTouchEnd={e => { (e.currentTarget as HTMLElement).style.transform = "scale(1)"; (e.currentTarget as HTMLElement).style.boxShadow = v === "=" ? `0 4px 20px ${cs.glow}` : ""; }}
                  >
                    {v}
                  </button>
                ))}
              </div>
              {!isMobile && (
                <p style={{ color: subText, fontSize: "0.65rem", textAlign: "center", marginTop: 10, letterSpacing: "0.02em" }}>
                  Клавиатура поддерживается · Esc — сброс · Enter — равно
                </p>
              )}
            </div>
          )}

          {/* ══ CONVERTER ══ */}
          {tab === "converter" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {(["currency","length","weight","temp"] as const).map(ct => (
                  <button key={ct} onClick={() => {
                    setConvType(ct);
                    setConvFromUnit(convUnits[ct][0]);
                    setConvToUnit(convUnits[ct][1] || convUnits[ct][0]);
                    setConvResult(""); setConvFrom(""); playClick();
                  }} style={{
                    flex: "1 0 auto",
                    background: convType === ct ? `linear-gradient(135deg, ${cs.a}, ${cs.b})` : isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.05)",
                    border: "none", borderRadius: "10px", padding: "8px 10px", cursor: "pointer",
                    color: convType === ct ? "#fff" : textColor, fontFamily: "'Montserrat', sans-serif",
                    fontWeight: 700, fontSize: "0.72rem", transition: "all 0.2s",
                  }}>
                    {{ currency: "💵 Валюта", length: "📏 Длина", weight: "⚖️ Вес", temp: "🌡 Температура" }[ct]}
                  </button>
                ))}
              </div>

              {convType === "currency" && (
                <div style={{ background: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)", borderRadius: "10px", padding: "8px 12px", color: subText, fontSize: "0.7rem", lineHeight: 1.6 }}>
                  Курсы: 1 USD ≈ 90 ₽ · 1 EUR ≈ 97 ₽ · 1 CNY ≈ 12.5 ₽ · 1 GBP ≈ 113 ₽
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 44px 1fr", gap: 8, alignItems: "center" }}>
                <div>
                  <div style={{ color: subText, fontSize: "0.72rem", marginBottom: 5 }}>Из</div>
                  <select value={convFromUnit} onChange={e => setConvFromUnit(e.target.value)} style={{ ...inputStyle, marginBottom: 6 }}>
                    {convUnits[convType].map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                  <input value={convFrom} onChange={e => setConvFrom(e.target.value)} placeholder="0" style={inputStyle} type="number" />
                </div>
                <div style={{ textAlign: "center", paddingTop: "26px" }}>
                  <button onClick={() => { const t = convFromUnit; setConvFromUnit(convToUnit); setConvToUnit(t); setConvResult(""); playClick(); }} style={{
                    background: cs.btn, border: `1px solid ${cs.a}44`,
                    borderRadius: "10px", width: 40, height: 40, cursor: "pointer",
                    color: cs.a, fontSize: "1.1rem", display: "flex", alignItems: "center", justifyContent: "center",
                  }}>⇄</button>
                </div>
                <div>
                  <div style={{ color: subText, fontSize: "0.72rem", marginBottom: 5 }}>В</div>
                  <select value={convToUnit} onChange={e => setConvToUnit(e.target.value)} style={{ ...inputStyle, marginBottom: 6 }}>
                    {convUnits[convType].map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                  <div style={{ ...inputStyle, background: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)", minHeight: 46, display: "flex", alignItems: "center" }}>
                    <span style={{ color: convResult ? textColor : subText, fontWeight: convResult ? 700 : 400 }}>
                      {convResult || "Результат"}
                    </span>
                  </div>
                </div>
              </div>
              <button onClick={convert} style={primaryBtn}>Конвертировать</button>
            </div>
          )}

          {/* ══ PERCENT ══ */}
          {tab === "percent" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", gap: 6 }}>
                {(["discount","markup","vat"] as const).map(m => (
                  <button key={m} onClick={() => { setPMode(m); setPResult([]); playClick(); }} style={{
                    flex: 1,
                    background: pMode === m ? `linear-gradient(135deg, ${cs.a}, ${cs.b})` : isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.05)",
                    border: "none", borderRadius: "10px", padding: "8px 4px", cursor: "pointer",
                    color: pMode === m ? "#fff" : textColor, fontFamily: "'Montserrat', sans-serif",
                    fontWeight: 700, fontSize: "0.72rem", transition: "all 0.2s",
                  }}>
                    {{ discount: "🏷️ Скидка", markup: "📈 Наценка", vat: "🧾 НДС" }[m]}
                  </button>
                ))}
              </div>
              <div>
                <div style={{ color: subText, fontSize: "0.75rem", marginBottom: 6 }}>Исходная сумма (₽)</div>
                <input value={pBase} onChange={e => setPBase(e.target.value)} placeholder="10 000" style={inputStyle} type="number" />
              </div>
              <div>
                <div style={{ color: subText, fontSize: "0.75rem", marginBottom: 6 }}>
                  {{ discount: "Размер скидки (%)", markup: "Размер наценки (%)", vat: "Ставка НДС (%)" }[pMode]}
                </div>
                <input value={pPct} onChange={e => setPPct(e.target.value)} placeholder="20" style={inputStyle} type="number" />
              </div>
              <button onClick={calcPercent} style={primaryBtn}>Рассчитать</button>
              {pResult.map((r, i) => (
                <div key={i} style={resultCard}>
                  <div style={{ color: subText, fontSize: "0.72rem", marginBottom: 4 }}>{r.label}</div>
                  <div style={{ color: textColor, fontWeight: 800, fontSize: "1.4rem", fontFamily: "'JetBrains Mono', monospace" }}>{r.value}</div>
                </div>
              ))}
            </div>
          )}

          {/* ══ CREDIT ══ */}
          {tab === "credit" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ color: textColor, fontWeight: 800, fontSize: "1rem" }}>🏦 Ипотека и кредит</div>
              <div>
                <div style={{ color: subText, fontSize: "0.75rem", marginBottom: 6 }}>Сумма кредита (₽)</div>
                <input value={crAmount} onChange={e => setCrAmount(e.target.value)} placeholder="3 000 000" style={inputStyle} type="number" />
              </div>
              <div>
                <div style={{ color: subText, fontSize: "0.75rem", marginBottom: 6 }}>Процентная ставка (% годовых)</div>
                <input value={crRate} onChange={e => setCrRate(e.target.value)} placeholder="15" style={inputStyle} type="number" />
              </div>
              <div>
                <div style={{ color: subText, fontSize: "0.75rem", marginBottom: 6 }}>Срок кредита (месяцев)</div>
                <input value={crMonths} onChange={e => setCrMonths(e.target.value)} placeholder="120" style={inputStyle} type="number" />
              </div>
              <button onClick={calcCredit} style={primaryBtn}>Рассчитать платёж</button>
              {crResult && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {[
                    { label: "💳 Ежемесячный платёж", value: Number(crResult.monthly).toLocaleString("ru-RU") + " ₽" },
                    { label: "💰 Итого выплатите", value: Number(crResult.total).toLocaleString("ru-RU") + " ₽" },
                    { label: "📊 Переплата", value: Number(crResult.overpay).toLocaleString("ru-RU") + " ₽" },
                  ].map((r, i) => (
                    <div key={i} style={resultCard}>
                      <div style={{ color: subText, fontSize: "0.72rem", marginBottom: 4 }}>{r.label}</div>
                      <div style={{ color: textColor, fontWeight: 800, fontSize: "1.3rem", fontFamily: "'JetBrains Mono', monospace" }}>{r.value}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ══ BMI ══ */}
          {tab === "bmi" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ color: textColor, fontWeight: 800, fontSize: "1rem" }}>⚖️ Индекс массы тела (ИМТ)</div>

              {/* Gender toggle */}
              <div style={{ display: "flex", gap: 8 }}>
                {([["m", "👨 Мужчина"], ["f", "👩 Женщина"]] as const).map(([g, label]) => (
                  <button key={g} onClick={() => { setBmiGender(g); playClick(); }} style={{
                    flex: 1,
                    background: bmiGender === g ? `linear-gradient(135deg, ${cs.a}, ${cs.b})` : isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.05)",
                    border: "none", borderRadius: "10px", padding: "10px", cursor: "pointer",
                    color: bmiGender === g ? "#fff" : textColor, fontFamily: "'Montserrat', sans-serif",
                    fontWeight: 700, fontSize: "0.82rem", transition: "all 0.2s",
                  }}>{label}</button>
                ))}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <div style={{ color: subText, fontSize: "0.75rem", marginBottom: 6 }}>Вес (кг)</div>
                  <input value={bmiWeight} onChange={e => setBmiWeight(e.target.value)} placeholder="70" style={inputStyle} type="number" />
                </div>
                <div>
                  <div style={{ color: subText, fontSize: "0.75rem", marginBottom: 6 }}>Рост (см)</div>
                  <input value={bmiHeight} onChange={e => setBmiHeight(e.target.value)} placeholder="175" style={inputStyle} type="number" />
                </div>
              </div>
              <div>
                <div style={{ color: subText, fontSize: "0.75rem", marginBottom: 6 }}>Возраст (лет, необязательно)</div>
                <input value={bmiAge} onChange={e => setBmiAge(e.target.value)} placeholder="30" style={inputStyle} type="number" />
              </div>
              <button onClick={calcBmi} style={primaryBtn}>Рассчитать ИМТ</button>

              {bmiResult && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {/* Big BMI number */}
                  <div style={{
                    ...resultCard,
                    textAlign: "center", padding: "20px 16px",
                    background: `linear-gradient(135deg, ${bmiResult.color}22, ${bmiResult.color}11)`,
                    border: `1px solid ${bmiResult.color}55`,
                  }}>
                    <div style={{ color: subText, fontSize: "0.75rem", marginBottom: 4 }}>Ваш ИМТ</div>
                    <div style={{ color: bmiResult.color, fontWeight: 900, fontSize: "3rem", fontFamily: "'JetBrains Mono', monospace", lineHeight: 1, textShadow: `0 0 30px ${bmiResult.color}88` }}>
                      {bmiResult.bmi}
                    </div>
                    <div style={{ color: bmiResult.color, fontWeight: 700, fontSize: "1rem", marginTop: 6 }}>{bmiResult.category}</div>
                  </div>
                  {/* Tip */}
                  <div style={{ ...resultCard, fontSize: "0.82rem", color: subText, lineHeight: 1.5 }}>
                    💡 {bmiResult.tip}
                  </div>
                  {/* Scale */}
                  <div style={{ ...resultCard }}>
                    <div style={{ color: subText, fontSize: "0.7rem", marginBottom: 8 }}>Шкала ИМТ</div>
                    {[
                      { label: "< 18.5", name: "Дефицит веса", color: "#60a5fa" },
                      { label: "18.5–24.9", name: "Норма", color: "#34d399" },
                      { label: "25–29.9", name: "Избыточный вес", color: "#fbbf24" },
                      { label: "30–34.9", name: "Ожирение I", color: "#f97316" },
                      { label: "≥ 35", name: "Ожирение II–III", color: "#ef4444" },
                    ].map((s, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: s.color, flexShrink: 0 }} />
                        <span style={{ color: s.color, fontWeight: 600, fontSize: "0.72rem", width: 70 }}>{s.label}</span>
                        <span style={{ color: subText, fontSize: "0.72rem" }}>{s.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ══ DATES ══ */}
          {tab === "dates" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ color: textColor, fontWeight: 800, fontSize: "1rem" }}>📅 Разница между датами</div>
              <div>
                <div style={{ color: subText, fontSize: "0.75rem", marginBottom: 6 }}>Дата начала</div>
                <input value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={inputStyle} type="date" />
              </div>
              <div>
                <div style={{ color: subText, fontSize: "0.75rem", marginBottom: 6 }}>Дата окончания</div>
                <input value={dateTo} onChange={e => setDateTo(e.target.value)} style={inputStyle} type="date" />
              </div>
              {/* Quick presets */}
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {[
                  { label: "Сегодня", days: 0 },
                  { label: "+1 год", days: 365 },
                  { label: "+6 мес", days: 182 },
                  { label: "+100 дней", days: 100 },
                ].map(p => (
                  <button key={p.label} onClick={() => {
                    const now = new Date();
                    const end = new Date(now.getTime() + p.days * 86400000);
                    setDateFrom(now.toISOString().split("T")[0]);
                    setDateTo(end.toISOString().split("T")[0]);
                    playClick();
                  }} style={{
                    background: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.05)",
                    border: isDark ? "1px solid rgba(255,255,255,0.12)" : "1px solid rgba(0,0,0,0.1)",
                    borderRadius: "8px", padding: "5px 10px", cursor: "pointer",
                    color: textColor, fontFamily: "'Montserrat', sans-serif", fontWeight: 600, fontSize: "0.72rem",
                  }}>{p.label}</button>
                ))}
              </div>
              <button onClick={calcDates} style={primaryBtn}>Вычислить разницу</button>
              {datesResult && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {[
                    { label: "📆 Всего дней", value: datesResult.days.toLocaleString("ru-RU") },
                    { label: "📅 Недель", value: datesResult.weeks.toLocaleString("ru-RU") },
                    { label: "🗓️ Месяцев", value: datesResult.months.toLocaleString("ru-RU") },
                    { label: "🎂 Лет", value: datesResult.years.toLocaleString("ru-RU") },
                    { label: "💼 Рабочих дней", value: datesResult.workdays.toLocaleString("ru-RU"), full: true },
                  ].map((r, i) => (
                    <div key={i} style={{ ...resultCard, ...(r.full ? { gridColumn: "1 / -1" } : {}) }}>
                      <div style={{ color: subText, fontSize: "0.7rem", marginBottom: 3 }}>{r.label}</div>
                      <div style={{ color: textColor, fontWeight: 800, fontSize: "1.5rem", fontFamily: "'JetBrains Mono', monospace" }}>{r.value}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ══ HISTORY ══ */}
          {tab === "history" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ color: textColor, fontWeight: 800, fontSize: "1rem" }}>📋 История ({history.length})</div>
                {history.length > 0 && (
                  <button onClick={() => { setHistory([]); playClick(); }} style={{
                    background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)",
                    borderRadius: "8px", padding: "5px 12px", cursor: "pointer",
                    color: "#f87171", fontSize: "0.72rem", fontFamily: "'Montserrat', sans-serif", fontWeight: 600,
                  }}>Очистить</button>
                )}
              </div>
              {history.length === 0 ? (
                <div style={{ textAlign: "center", color: subText, padding: "40px 0", fontSize: "0.85rem" }}>
                  Нет вычислений ещё.<br />Начни считать в основном режиме!
                </div>
              ) : history.map((h, i) => (
                <div key={i} onClick={() => { setDisplay(h.result); setTab("calc"); playClick(); }}
                  style={{ ...resultCard, cursor: "pointer", transition: "opacity 0.15s" }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.opacity = "0.75"}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.opacity = "1"}
                >
                  <div style={{ color: subText, fontSize: "0.7rem", marginBottom: 3 }}>{h.time} · {h.expression || "прямой ввод"}</div>
                  <div style={{ color: textColor, fontWeight: 800, fontSize: "1.25rem", fontFamily: "'JetBrains Mono', monospace" }}>= {h.result}</div>
                </div>
              ))}
              {favorites.length > 0 && (
                <>
                  <div style={{ color: textColor, fontWeight: 800, fontSize: "0.95rem", marginTop: 8 }}>★ Избранное ({favorites.length})</div>
                  {favorites.map((h, i) => (
                    <div key={i} onClick={() => { setDisplay(h.result); setTab("calc"); playClick(); }}
                      style={{ ...resultCard, cursor: "pointer", border: `1px solid ${cs.a}66` }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.opacity = "0.75"}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.opacity = "1"}
                    >
                      <div style={{ color: subText, fontSize: "0.7rem", marginBottom: 3 }}>{h.expression}</div>
                      <div style={{ color: textColor, fontWeight: 800, fontSize: "1.25rem", fontFamily: "'JetBrains Mono', monospace" }}>= {h.result}</div>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}

        </div>
      </div>

      <style>{`
        @keyframes orb0 { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(40px,-50px) scale(1.12)} }
        @keyframes orb1 { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(-30px,40px) scale(0.88)} }
        @keyframes orb2 { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(50px,25px) scale(1.08)} }
        @keyframes cfall { 0%{transform:translateY(0) rotate(0deg);opacity:1} 100%{transform:translateY(110vh) rotate(900deg);opacity:0} }
        select { appearance: none; -webkit-appearance: none; }
        select option { background: ${isDark ? "#1a1030" : "#f5f3ff"}; color: ${isDark ? "#f1f0ff" : "#1e1b4b"}; }
        input[type=number]::-webkit-inner-spin-button, input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; }
        input[type=date] { color-scheme: ${isDark ? "dark" : "light"}; }
        input[type=date]::-webkit-calendar-picker-indicator { filter: ${isDark ? "invert(1) opacity(0.5)" : "opacity(0.5)"}; cursor: pointer; }
        ::-webkit-scrollbar { width: 3px; height: 3px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${cs.a}55; border-radius: 3px; }
        * { -webkit-tap-highlight-color: transparent; }
        @media (max-width: 480px) {
          body { overscroll-behavior: none; }
        }
      `}</style>
    </div>
  );
}
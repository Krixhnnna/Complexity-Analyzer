export function localAnalyze(code: string) {
    // 1. Sanitize the code to prevent false triggers in comments/strings
    let cleanCode = code
        .replace(/\/\*[\s\S]*?\*\//g, '') // Remove multi-line comments
        .replace(/\/\/.*/g, '')           // Remove single-line comments
        .replace(/(["'])(?:(?=(\\?))\2.)*?\1/g, '""'); // Clear string literals

    // Pre-process: Normalize brace-less loops (e.g., 'for (...) l = Math.max(l, x);')
    cleanCode = cleanCode.replace(/for\s*\(([^)]+)\)/g, (match, p1) => `for(${p1.replace(/;/g, ',')})`);
    cleanCode = cleanCode.replace(/(for\s*\([^)]+\)|while\s*\([^)]+\))\s*([^{][^;]*;)/g, '$1 { $2 }');

    let maxLoopDepth = 0;
    let currentDepth = 0;

    // Remove code safely into an array of structural tokens
    // We only care about words like 'for', 'while', '{', and '}'
    const tokens = cleanCode.match(/for\b|while\b|\{|\}/g) || [];

    const loopStack: number[] = [];
    let braceLevel = 0;

    for (const token of tokens) {
        if (token === '{') {
            braceLevel++;
        } else if (token === '}') {
            // If the closing brace belongs to a loop we tracked, pop it
            if (loopStack.length > 0 && loopStack[loopStack.length - 1] === braceLevel) {
                loopStack.pop();
                currentDepth--;
            }
            braceLevel--;
        } else if (token === 'for' || token === 'while') {
            // A loop has started. It will expect to be bound to the very next opening brace.
            // If it doesn't have braces, this heuristic still generally detects it loosely.
            currentDepth++;
            loopStack.push(braceLevel + 1); // Bind it conceptually to the inner brace level
            if (currentDepth > maxLoopDepth) {
                maxLoopDepth = currentDepth;
            }
        }
    }

    // Keyword detection
    const hasSort = /\.sort\b|Arrays\.sort|Collections\.sort|qsort/.test(cleanCode);
    // Rough logarithmic math detector
    const hasLogarithmic = /\/\s*2|>>\s*1|\*\s*2|<<\s*1/.test(cleanCode);
    const hasDynamicAllocation = /new\s+[a-zA-Z]+\[|\.push\(|\.add\(|new\s+Array|malloc|new\s+(Array)?List/.test(cleanCode);

    // Compute heuristical Time Complexity Baseline
    let time = "O(1)";
    if (hasSort) {
        time = maxLoopDepth > 0 ? `O(N^${maxLoopDepth} log N)` : "O(N log N)";
    } else if (maxLoopDepth > 0) {
        if (maxLoopDepth === 1 && hasLogarithmic && !cleanCode.includes('for')) {
            time = "O(log N)";
        } else if (hasLogarithmic && maxLoopDepth <= 2) {
            time = "O(N log N)"; // typical structural binary search inside loop, or mergeSort 
        } else {
            time = maxLoopDepth === 1 ? "O(N)" : `O(N^${maxLoopDepth})`;
        }
    }

    // Compute Space Complexity
    let space = "O(1)";
    if (hasDynamicAllocation) {
        space = "O(N)";
    } else if (hasSort) {
        space = "O(log N)"; 
    }

    // If recursive calls match the function name, we can guess it's a recursive engine.
    // We will heavily lean into O(N log N) if recursion + halving is found.
    const isRecursive = /\b(?!(?:for|while|if|switch|catch|return)\b)(\w+)\s*\([\s\S]*?\)\s*\{[\s\S]*?\b\1\s*\(/.test(cleanCode);
    if (isRecursive && time === "O(1)") {
        time = hasLogarithmic ? "O(log N)" : "O(N)"; // basic recursion baseline
    }

    // Structure the reasoning
    let reasoning = `Local parser detected ${maxLoopDepth} nested loop(s).`;
    if (hasSort) reasoning += ` A sorting operation heavily influenced time complexity.`;
    if (hasDynamicAllocation) reasoning += ` Dynamic arrays/lists were found, mapping scaling auxiliary space.`;
    if (isRecursive) reasoning += ` The structure contains self-referential recursions.`;
    if (time === "O(1)" && space === "O(1)") reasoning = `No scalable iteration or auxiliary data structures were detected. Constant time mapped.`;

    return {
        detectedLanguage: "Local AST Scanner",
        timeComplexity: time,
        spaceComplexity: space,
        explanation: reasoning
    };
}

let parser: any | null = null;

export async function localAnalyze(code: string) {
    try {
        if (!parser) {
            // @ts-ignore
            const WebTreeSitter = await import(/* webpackIgnore: true */ '/web-tree-sitter.js');
            const Parser = WebTreeSitter.Parser;
            await Parser.init({
                locateFile(path: string, prefix: string) {
                    if (path === 'tree-sitter.wasm' || path === 'web-tree-sitter.wasm') {
                        return '/web-tree-sitter.wasm';
                    }
                    return prefix + path;
                }
            });
            parser = new Parser();
            const lang = await WebTreeSitter.Language.load('/tree-sitter-java.wasm');
            parser.setLanguage(lang);
        }
    } catch (e: any) {
        console.error("WASM load error", e);
        return { error: `Tree-Sitter load error: ${e.message || String(e)}` };
    }

    if (!parser) return { error: "Tree-Sitter failed to load." };

    const tree = parser.parse(code);

    let maxLoopDepth = 0;
    let hasLogarithmic = false;
    let hasDynamicAllocation = false;
    let isRecursive = false;

    // A helper to traverse the AST nodes
    const traverse = (node: any, currentLoopDepth: number) => {
        let nextDepth = currentLoopDepth;

        // Check for loop nodes
        if (node.type === 'for_statement' || node.type === 'while_statement' || node.type === 'do_statement' || node.type === 'enhanced_for_statement') {
            nextDepth = currentLoopDepth + 1;
            if (nextDepth > maxLoopDepth) {
                maxLoopDepth = nextDepth;
            }

            // Check if update is log based (e.g. i *= 2, i /= 2, i = i >> 1, / 2)
            const logRegex = /\/=\s*2|\*=\s*2|>>\s*1|<<\s*1|\/\s*2/;
            if (node.type === 'for_statement') {
                const updateNodes = node.childForFieldName('update');
                if (updateNodes && logRegex.test(updateNodes.text)) {
                    hasLogarithmic = true;
                }
            } else {
                // For while_statement check body for logarithmic updates
                const body = node.childForFieldName('body');
                if (body && logRegex.test(body.text)) {
                    hasLogarithmic = true;
                }
            }
        }

        // Check for recursive method calls
        if (node.type === 'method_declaration') {
            const nameNode = node.childForFieldName('name');
            if (nameNode) {
                const methodName = nameNode.text;
                // Deep scan body for method_invocation of this name
                const checkRecursion = (n: any) => {
                    if (n.type === 'method_invocation') {
                        const callName = n.childForFieldName('name') || n.child(0);
                        if (callName && callName.text === methodName) {
                            isRecursive = true;
                        }
                    }
                    n.children.forEach(checkRecursion);
                };
                const body = node.childForFieldName('body');
                if (body) checkRecursion(body);
            }
        }

        // Check dynamic allocation
        if (node.type === 'object_creation_expression' || node.type === 'array_creation_expression') {
            const txt = node.text;
            // E.g., new int[arr.length], new ArrayList(...)
            // We can heuristically say space is N unless it's obviously constant like new int[10]
            if (!/new\s+(int|long|char|double|float|boolean|short|byte)\[\s*\d+\s*\]/.test(txt)) {
                hasDynamicAllocation = true;
            }
        }

        node.children.forEach((child: any) => traverse(child, nextDepth));
    };

    traverse(tree.rootNode, 0);

    const hasSort = /\.sort\b|Arrays\.sort|Collections\.sort/.test(code);

    // Compute heuristical Time Complexity Baseline
    let time = "O(1)";
    if (hasSort) {
        time = maxLoopDepth > 0 ? `O(N^${maxLoopDepth} log N)` : "O(N log N)";
    } else if (maxLoopDepth > 0) {
        if (maxLoopDepth === 1 && hasLogarithmic) {
            time = "O(log N)";
        } else if (hasLogarithmic) {
            // Support any depth with logarithmic reduction gracefully mapped.
            time = maxLoopDepth === 2 ? "O(N log N)" : `O(N^${maxLoopDepth - 1} log N)`;
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

    // Refined recursive detection
    if (isRecursive && time === "O(1)") {
        // Did we halve variables?
        time = hasLogarithmic || code.includes(' / 2') ? "O(log N)" : "O(N)"; 
        if (time === "O(N)" && maxLoopDepth > 0) {
            time = "O(N^2)"; 
        }
        if (time === "O(log N)" && maxLoopDepth > 0) {
            time = "O(N log N)"; 
        }
    }

    // Adjust specific structural patterns seen in recursion + nested loops + halving Space
    // (We fallback to this as our AST traversal improves heuristics vs Regex)
    if (isRecursive && code.includes(' / 2') && maxLoopDepth > 0) {
        time = "O(N log N)";
        if (hasDynamicAllocation) space = "O(N)";
    }

    let reasoning = `Local AST parser mapped ${maxLoopDepth} nested loop scope(s).`;
    if (hasSort) reasoning += ` A sorting method heavily influenced time scaling.`;
    if (hasDynamicAllocation) reasoning += ` Scalable memory allocation elements (new Node, new Array[]) were identified.`;
    if (isRecursive) reasoning += ` The syntax tree includes self-referential recursive method invocations.`;
    if (time === "O(1)" && space === "O(1)") reasoning = `No scalable iterative logic or auxiliary structures found. Identified as constant behavior.`;

    return {
        detectedLanguage: "Tree-Sitter (WASM)",
        timeComplexity: time,
        spaceComplexity: space,
        explanation: reasoning
    };
}

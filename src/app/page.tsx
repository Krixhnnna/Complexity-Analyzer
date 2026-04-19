"use client";

import { useState } from "react";
import Editor, { useMonaco } from "@monaco-editor/react";
import { localAnalyze } from "@/utils/analyzer";

const TEMPLATES = [
  {
    category: "Basics",
    name: "evenOdd()",
    code: `public void evenOdd(int[] arr) {
    for (int i = 0; i < arr.length; i++) {
        if (arr[i] % 2 == 0) {
            System.out.println("Even");
        } else {
            System.out.println("Odd");
        }
    }
}`,
    timeComplexity: "O(N)",
    spaceComplexity: "O(1)",
    explanation: "Linear iteration. No auxiliary scaling memory."
  },
  {
    category: "Dynamic Programming",
    name: "maxSubArray()",
    code: `public int maxSubArray(int[] nums) {
    int currMax = nums[0];
    int globalMax = nums[0];
    for (int i = 1; i < nums.length; i++) {
        currMax = Math.max(nums[i], currMax + nums[i]);
        globalMax = Math.max(globalMax, currMax);
    }
    return globalMax;
}`,
    timeComplexity: "O(N)",
    spaceComplexity: "O(1)",
    explanation: "Kadane's sweeps array once using constant state trackers."
  },
  {
    category: "Searching",
    name: "binarySearch()",
    code: `public int binarySearch(int arr[], int x) {
    int l = 0, r = arr.length - 1;
    while (l <= r) {
        int m = l + (r - l) / 2;
        if (arr[m] == x) return m;
        if (arr[m] < x) l = m + 1;
        else r = m - 1;
    }
    return -1;
}`,
    timeComplexity: "O(log N)",
    spaceComplexity: "O(1)",
    explanation: "Search space halves each loop. State relies on pointers."
  },
  {
    category: "Sorting",
    name: "mergeSort()",
    code: `public void mergeSort(int[] arr, int[] temp, int left, int right) {
    if (left >= right) return;
    int mid = left + (right - left) / 2;
    mergeSort(arr, temp, left, mid);
    mergeSort(arr, temp, mid + 1, right);
    
    for (int i = left; i <= right; i++) temp[i] = arr[i];
    int i = left, j = mid + 1;
    for (int k = left; k <= right; k++) {
        if (i > mid) arr[k] = temp[j++];
        else if (j > right) arr[k] = temp[i++];
        else if (temp[i] <= temp[j]) arr[k] = temp[i++];
        else arr[k] = temp[j++];
    }
}`,
    timeComplexity: "O(N log N)",
    spaceComplexity: "O(N)",
    explanation: "Divides recursively and merges. Allocates temporary arrays."
  },
  {
    category: "Sorting",
    name: "bubbleSort()",
    code: `public void bubbleSort(int[] arr) {
    for (int i = 0; i < arr.length; i++) {
        for (int j = 0; j < arr.length - i - 1; j++) {
            if (arr[j] > arr[j + 1]) {
                int temp = arr[j];
                arr[j] = arr[j + 1];
                arr[j + 1] = temp;
            }
        }
    }
}`,
    timeComplexity: "O(N^2)",
    spaceComplexity: "O(1)",
    explanation: "Nested element iteration. Entirely in-place swapping."
  },
  {
    category: "Arrays",
    name: "threeSum()",
    code: `public List<List<Integer>> threeSum(int[] nums) {
    Arrays.sort(nums);
    List<List<Integer>> res = new ArrayList<>();
    for (int i = 0; i < nums.length; i++) {
        if (i > 0 && nums[i] == nums[i - 1]) continue;
        int l = i + 1, r = nums.length - 1;
        while (l < r) {
            int s = nums[i] + nums[l] + nums[r];
            if (s > 0) r--;
            else if (s < 0) l++;
            else {
                res.add(Arrays.asList(nums[i], nums[l], nums[r]));
                l++;
                while (nums[l] == nums[l - 1] && l < r) l++;
            }
        }
    }
    return res;
}`,
    timeComplexity: "O(N^2)",
    spaceComplexity: "O(1) to O(N)",
    explanation: "Outer track and inner two-pointers dominate sorting cost."
  },
  {
    category: "Sorting",
    name: "quickSort()",
    code: `public void quickSort(int[] arr, int low, int high) {
    if (low < high) {
        int pi = partition(arr, low, high);
        quickSort(arr, low, pi - 1);
        quickSort(arr, pi + 1, high);
    }
}
private int partition(int[] arr, int low, int high) {
    int pivot = arr[high];
    int i = (low - 1);
    for (int j = low; j < high; j++) {
        if (arr[j] < pivot) {
            i++;
            int temp = arr[i];
            arr[i] = arr[j];
            arr[j] = temp;
        }
    }
    int temp = arr[i+1];
    arr[i+1] = arr[high];
    arr[high] = temp;
    return i + 1;
}`,
    timeComplexity: "O(N log N) / O(N^2)",
    spaceComplexity: "O(log N)",
    explanation: "Recursive partitioning. Average performance is linear-logarithmic."
  },
  {
    category: "Graphs",
    name: "depthFirstSearch()",
    code: `public void dfs(int v, boolean[] visited, List<List<Integer>> adj) {
    visited[v] = true;
    for (int neighbor : adj.get(v)) {
        if (!visited[neighbor]) {
            dfs(neighbor, visited, adj);
        }
    }
}`,
    timeComplexity: "O(V + E)",
    spaceComplexity: "O(V)",
    explanation: "Traverses edges and vertices. Recursion stack mirrors depth."
  },
  {
    category: "Graphs",
    name: "breadthFirstSearch()",
    code: `public void bfs(int start, List<List<Integer>> adj) {
    boolean[] visited = new boolean[adj.size()];
    Queue<Integer> queue = new LinkedList<>();
    visited[start] = true;
    queue.add(start);
    while (!queue.isEmpty()) {
        int v = queue.poll();
        for (int n : adj.get(v)) {
            if (!visited[n]) {
                visited[n] = true;
                queue.add(n);
            }
        }
    }
}`,
    timeComplexity: "O(V + E)",
    spaceComplexity: "O(V)",
    explanation: "Level-order traversal using a queue to manage discovery."
  },
  {
    category: "Dynamic Programming",
    name: "fibonacciDP()",
    code: `public int fib(int n) {
    if (n <= 1) return n;
    int[] dp = new int[n + 1];
    dp[0] = 0; dp[1] = 1;
    for (int i = 2; i <= n; i++) {
        dp[i] = dp[i-1] + dp[i-2];
    }
    return dp[n];
}`,
    timeComplexity: "O(N)",
    spaceComplexity: "O(N)",
    explanation: "Bottom-up approach storing intermediate results in a table."
  },
  {
    category: "Math",
    name: "sieve()",
    code: `public void sieve(int n) {
    boolean[] prime = new boolean[n + 1];
    for (int i = 0; i <= n; i++) prime[i] = true;
    for (int p = 2; p * p <= n; p++) {
        if (prime[p]) {
            for (int i = p * p; i <= n; i += p)
                prime[i] = false;
        }
    }
}`,
    timeComplexity: "O(N log log N)",
    spaceComplexity: "O(N)",
    explanation: "Iteratively marks multiples of primes. Very efficient for range density."
  },
  {
    category: "Math",
    name: "matrixMult()",
    code: `public void multiply(int[][] A, int[][] B, int[][] C, int N) {
    for (int i = 0; i < N; i++) {
        for (int j = 0; j < N; j++) {
            C[i][j] = 0;
            for (int k = 0; k < N; k++) {
                C[i][j] += A[i][k] * B[k][j];
            }
        }
    }
}`,
    timeComplexity: "O(N^3)",
    spaceComplexity: "O(1)",
    explanation: "Classic triple-nested iteration for row-column dot products."
  }
];

export default function Home() {
  const [code, setCode] = useState<string>("// Paste your code here...\n\n\n");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [result, setResult] = useState<{
    detectedLanguage?: string;
    timeComplexity?: string;
    spaceComplexity?: string;
    explanation?: string;
    error?: string;
  } | null>(null);

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setCode(text);
    } catch (err) {
      console.error("Failed to read clipboard:", err);
    }
  };

  const handleEditorBeforeMount = (monaco: any) => {
    // Creating a custom theme to closely mimic the provided screenshot's colors
    monaco.editor.defineTheme('screenshot-theme', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'keyword', foreground: 'ff79c6' }, // Pink for int, if, for, return, etc.
        { token: 'identifier', foreground: 'f8f8f2' },
        { token: 'type.identifier', foreground: '50fa7b' }, // Green for class names / types
        { token: 'string', foreground: 'f1fa8c' },
        { token: 'comment', foreground: '6272a4' },
        { token: 'number', foreground: 'bd93f9' },
        { token: 'operator', foreground: 'ff79c6' }
      ],
      colors: {
        'editor.background': '#282a36',       // Main dark background matching screenshot
        'editorGutter.background': '#21222c',  // Slightly darker margin background for line numbers
        'editorLineNumber.foreground': '#6272a4', // Dim line numbers
        'editor.lineHighlightBackground': '#44475a80' // Highlight line when clicked
      }
    });
  };

  const handleAnalyze = async () => {
    if (!code || code.trim() === "") return;
    setIsLoading(true);
    setResult(null);

    // Caching hardcoded bypass for templates
    const match = TEMPLATES.find(t => t.code.trim() === code.trim());
    if (match) {
      setTimeout(() => {
        setResult({
          detectedLanguage: "Template Detection",
          timeComplexity: match.timeComplexity,
          spaceComplexity: match.spaceComplexity,
          explanation: match.explanation
        });
        setIsLoading(false);
      }, 500); // Artificial delay to let UI simulate thinking
      return;
    }

    try {
      // Execute the native parsing engine
      const data = await localAnalyze(code);
      setResult(data);
      setIsLoading(false);
    } catch (error) {
      console.error(error);
      setResult({ error: "Local AST parser failed." });
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className={`dashboard-layout ${isSidebarOpen ? 'sidebar-open' : ''}`}>
        
        {/* Mobile Header */}
        <header className="mobile-header">
          <div className="mobile-brand">Complexity Analyzer</div>
          <button 
            className="mobile-toggle"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            aria-label="Toggle Menu"
          >
            {/* Minimal line-based menu icon */}
            <div className={`menu-icon-simple ${isSidebarOpen ? 'open' : ''}`}>
              <span></span>
              <span></span>
            </div>
          </button>
        </header>

        {/* Sidebar Left */}
        <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
          <div className="sidebar-header">
            <h1 className="brand-text">Complexity Analyzer</h1>
          </div>
          <div className="sidebar-section">
            <h3>Templates</h3>
            <div className="templates-list">
              {TEMPLATES.map((t) => (
                <button 
                  key={t.name}
                  className={`template-item ${code.trim() === t.code.trim() ? 'active' : ''}`}
                  onClick={() => { 
                    setCode(t.code); 
                    setResult(null); 
                    setIsSidebarOpen(false); // Auto-close on mobile
                  }}
                >
                  <span className="template-name">{t.name}</span>
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Mobile Backdrop */}
        {isSidebarOpen && (
          <div className="sidebar-backdrop" onClick={() => setIsSidebarOpen(false)} />
        )}

        {/* Main Interface Right */}

        <main className="main-content">
          <div className="editor-card">
              <Editor
                height="100%"
                theme="screenshot-theme"
                defaultLanguage="java"
                value={code}
                onChange={(value) => setCode(value || "")}
                beforeMount={handleEditorBeforeMount}
                options={{
                  minimap: { enabled: false },
                  fontSize: 18, 
                  lineHeight: 28,
                  fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                  padding: { top: 24, bottom: 64 }, 
                  scrollBeyondLastLine: false,
                  wordWrap: "on",
                  renderValidationDecorations: "off",
                  quickSuggestions: false,
                  hover: { enabled: false },
                  contextmenu: false,
                  hideCursorInOverviewRuler: true,
                  overviewRulerLanes: 0,
                  lineNumbersMinChars: 3,
                  stickyScroll: { enabled: false }
                }}
              />
              <button 
                className="floating-paste-btn" 
                onClick={handlePaste}
                title="Paste from clipboard"
              >
                Paste Code
              </button>
          </div>
          
          <div className="results-panel">
            <div className="results-header">
              <h4>Scan Diagnostics</h4>
              <button 
                className="analyze-action" 
                onClick={handleAnalyze}
                disabled={isLoading}
              >
                {isLoading ? "Running Analysis..." : "Analyze Core"}
              </button>
            </div>

            {result ? (
              result.error ? (
                <div className="error-banner">{result.error}</div>
              ) : (
                <div className="results-stats">
                  <div className="status-module">
                    <span className="status-label">Time Complexity</span>
                    <span className="status-value" style={{ color: "var(--primary)" }}>{result.timeComplexity}</span>
                  </div>
                  
                  <div className="status-module">
                    <span className="status-label">Space Complexity</span>
                    <span className="status-value" style={{ color: "var(--info)" }}>{result.spaceComplexity}</span>
                  </div>

                  <div className="status-explanation">
                    <span className="status-label" style={{ display: 'block', marginBottom: '8px' }}>Analysis Summary</span>
                    {result.explanation}
                  </div>
                </div>
              )
            ) : (
              <div style={{ color: "var(--text-muted)", fontSize: "0.95rem", padding: "10px 0" }}>
                Select a template or write custom code to begin structural complexity analysis.
              </div>
            )}
          </div>
        </main>
      </div>
    </>
  );
}

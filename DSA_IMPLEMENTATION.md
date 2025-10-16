# Data Structures & Algorithms (DSA) Implementation in CivicWatch

## Currently Used DSA Concepts

### 1. **Arrays (Linear Data Structure)**
**Files:** All component files
- `src/pages/IssuesList.tsx` - Line 122: `.map()` for rendering issues
- `src/pages/AdminDashboard.tsx` - Line 190: `.map()` for rendering issues
- `src/pages/Leaderboard.tsx` - Line 72: `.map()` for rendering users
- `src/pages/IssueDetail.tsx` - Line 223: `.map()` for rendering updates

**Usage:** Storing and iterating through lists of issues, users, and updates

### 2. **Hash Maps / Objects (Key-Value Pairs)**
**Files:** 
- `src/components/IssueCard.tsx` - Lines 23-45:
  - `categoryLabels` - O(1) lookup for category names
  - `statusLabels` - O(1) lookup for status names  
  - `statusColors` - O(1) lookup for status colors

**Time Complexity:** O(1) for lookups

### 3. **Sorting Algorithm**
**Files:**
- `src/pages/IssuesList.tsx` - SQL: `.order("created_at", { ascending: false })`
- `src/pages/AdminDashboard.tsx` - SQL: `.order("created_at", { ascending: false })`
- `src/pages/Leaderboard.tsx` - SQL: `.order("points", { ascending: false })`
- `src/pages/IssueDetail.tsx` - SQL: `.order("created_at", { ascending: false })`

**Implementation:** Database-level sorting (PostgreSQL uses Quicksort variant)
**Time Complexity:** O(n log n)

### 4. **Filtering Algorithm**
**Files:**
- `src/pages/IssuesList.tsx` - SQL WHERE clauses for status and category filters

**Time Complexity:** O(n) linear scan

### 5. **Priority Score (Implicit Heap/Priority Queue Concept)**
**Files:**
- `src/pages/ReportIssue.tsx` - Line 110: `priority_score: 0`
- Database schema: `issues` table has `priority_score` column

**Current State:** Not actively used, but prepared for priority queue implementation

## Recommended DSA Enhancements

### 1. **Priority Queue for Issue Management**
**File to Create:** `src/utils/priorityQueue.ts`
**Use Case:** Automatically prioritize urgent issues based on:
- Number of upvotes
- Time since reported
- Category (safety issues = higher priority)
- Location density

**Algorithm:** Min/Max Heap
**Time Complexity:** 
- Insert: O(log n)
- Extract Max: O(log n)
- Peek: O(1)

### 2. **Binary Search for Issue Lookup**
**File to Enhance:** `src/pages/IssuesList.tsx`
**Use Case:** Quick search through sorted issues list
**Time Complexity:** O(log n) vs O(n) linear search

### 3. **Trie Data Structure for Autocomplete**
**File to Create:** `src/utils/trie.ts`
**Use Case:** Search suggestions as user types issue title or location
**Time Complexity:** O(m) where m = length of search term

### 4. **Graph Algorithm for Location Clustering**
**File to Create:** `src/utils/issueGraph.ts`
**Use Case:** Group nearby issues together, find issue clusters in neighborhoods
**Algorithm:** Union-Find / Disjoint Set Union
**Time Complexity:** Nearly O(1) with path compression

### 5. **Sliding Window for Real-time Stats**
**File to Enhance:** `src/pages/AdminDashboard.tsx`
**Use Case:** Calculate issues resolved in last 7 days, 30 days
**Time Complexity:** O(1) amortized

### 6. **LRU Cache for Frequently Accessed Issues**
**File to Create:** `src/utils/lruCache.ts`
**Use Case:** Cache popular/trending issues to reduce database calls
**Time Complexity:** O(1) for get and put operations

## Priority Score Calculation Algorithm

**Suggested Formula:**
```
priority_score = (upvotes * 10) + (age_in_hours * 2) + category_weight
```

**Category Weights:**
- Safety: 100
- Roads: 50
- Water: 40
- Lighting: 30
- Waste: 20
- Parks: 10
- Other: 5

**Files to Modify:**
- Database trigger function to auto-calculate priority
- `src/pages/IssuesList.tsx` - Sort by priority_score
- `src/pages/AdminDashboard.tsx` - Show high-priority issues first

## Space-Time Complexity Summary

| Operation | Current | With DSA Enhancement | Improvement |
|-----------|---------|---------------------|-------------|
| Issue Search | O(n) | O(log n) | Binary Search |
| Priority Sorting | O(n log n) | O(log n) per insert | Min Heap |
| Autocomplete | N/A | O(m) | Trie |
| Location Clustering | O(n²) | O(n α(n)) | Union-Find |
| Trending Issues | O(n) | O(1) | LRU Cache |

## Implementation Priority

1. **High Priority:** Priority Queue for issue urgency
2. **Medium Priority:** Binary Search for issue lookup  
3. **Medium Priority:** Trie for search autocomplete
4. **Low Priority:** Graph clustering for location analysis
5. **Low Priority:** LRU Cache for performance optimization

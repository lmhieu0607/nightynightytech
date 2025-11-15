function sum_to_n_a(n: number): number {
    // Complexity O(n)
    let result = 0;

    for (let i = 1; i <= n; i++) {
        result += i;
    }

    return result;
}

function sum_to_n_b(n: number): number {
    // Complexity O(logn)
    let low = 1;
    let high = n;
    let result = 0;

    while (low < high) {
        result += low + high;

        low++;
        high--;
    }

    if (low === high) {
        result += low;
    }

    return result;
}

function sum_to_n_c(n: number): number {
    // Complexity O(1)
    return (n * (n + 1)) / 2;
}
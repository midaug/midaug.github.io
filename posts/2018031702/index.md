# leetCode习题(简单难度)-int数值翻转


# 题目内容
给定一个范围为<span style="border-bottom:2px dashed #fc6423;">32</span> 位 int 的整数，将其颠倒。
例 1:
输入: 123
输出: 321
例 2:
输入: -123
输出: -321
例 3:
输入: 120
输出: 21
注意:
假设我们的环境只能处理 32 位 int 范围内的整数。根据这个假设，如果<span style="border-bottom:2px dashed #fc6423;">颠倒后的结果超过这个范围，则返回 0</span>。

<!-- more -->

# 解法
```java
package com.mid.test;

public class LeetCode001 {

	public static void main(String[] args) {
		System.out.println(reverse(-1230));
	}

	private static int reverse(int x) {
		long tmp = x; // 防止结果溢出
		long result = 0;
		while (tmp != 0) { // 当tmp<10时，tmp / 10才等于0
			result = result * 10 + tmp % 10;
			tmp = tmp / 10;
			// System.out.println(result + "     " + tmp);
		}
		if (result < Integer.MIN_VALUE || result > Integer.MAX_VALUE) {
			result = 0;
		}
		return (int) result;
	}

}

```

# 思路
利用取余的特性，对10取余余数就是最后一位数字，然后将这个余数乘以10加上下一个余数。
在while里打印就能很清晰的看到过程
```java
0     -123
-3     -12
-32     -1
-321     0
```

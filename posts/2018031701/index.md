# leetCode习题(简单难度)-int数组去重


# 题目内容
给定一个<span style="border-bottom:2px dashed #fc6423;">有序数组</span>，你需要原地删除其中的重复内容，使每个元素只出现一次,并返回新的长度。
<span style="border-bottom:2px dashed #fc6423;">不要另外定义一个数组</span>，您必须通过用 O(1) 额外内存<span style="border-bottom:2px dashed #fc6423;">原地修改</span>输入的数组来做到这一点。
示例：
给定数组: nums = [1,1,2],
你的函数应该返回新长度 2, 并且原数组nums的前两个元素必须是1和2
不需要理会新的数组长度后面的元素

<!-- more -->

# 解法
```java
package com.mid.test;
import java.util.Arrays;

public class LeetCode002 {

	public static void main(String[] args) {
		int[] nums = { 1, 1, 1, 2 };
		int newLength = removeDuplicates(nums);
		System.out.println(newLength);
		System.out.println(Arrays.toString(Arrays.copyOf(nums, newLength)));
	}

	public static int removeDuplicates(int[] nums) {
		int len = nums.length;
		if (len < 2) {
			return len;
		}
		int end = 0; //新数组长度
		for (int i = 1; i < len; i++) {
			if (nums[i] != nums[end]) { //不同时将不同的值放置在新数组的下一个位置
				end++;
				nums[end] = nums[i];
			}
		}
		return end + 1;
	}

}
```

# 思路
我之前的思路有所差异是将相同的往后移
新的想法：将不同的往对应顺序上塞

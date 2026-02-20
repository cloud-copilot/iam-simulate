import { describe, expect, it } from 'vitest'
import { resourceArnsOverlap } from './resourceStrings.js'

const resourceArnsOverlapTests: {
  name: string
  only?: true
  patternA: string
  patternB: string
  overlaps: boolean
}[] = [
  {
    name: 'identical_literal_ec2_instance',
    patternA: 'arn:aws:ec2:us-east-1:123456789012:instance/i-0abcd1234ef567890',
    patternB: 'arn:aws:ec2:us-east-1:123456789012:instance/i-0abcd1234ef567890',
    overlaps: true
  },
  {
    name: 'different_literal_ec2_instance_no_overlap',
    patternA: 'arn:aws:ec2:us-east-1:123456789012:instance/i-0abcd1234ef567890',
    patternB: 'arn:aws:ec2:us-east-1:123456789012:instance/i-11111111111111111',
    overlaps: false
  },
  {
    name: 'wildcard_region_overlaps_literal',
    patternA: 'arn:aws:ec2:*:123456789012:instance/i-0abcd1234ef567890',
    patternB: 'arn:aws:ec2:us-east-1:123456789012:instance/i-0abcd1234ef567890',
    overlaps: true
  },
  {
    name: 'wildcard_account_overlaps_literal',
    patternA: 'arn:aws:ec2:us-east-1:*:instance/i-0abcd1234ef567890',
    patternB: 'arn:aws:ec2:us-east-1:123456789012:instance/i-0abcd1234ef567890',
    overlaps: true
  },
  {
    name: 'service_mismatch_no_overlap',
    patternA: 'arn:aws:ec2:us-east-1:123456789012:instance/*',
    patternB: 'arn:aws:lambda:us-east-1:123456789012:function:*',
    overlaps: false
  },
  {
    name: 'resource_type_mismatch_ec2_instance_vs_volume',
    patternA: 'arn:aws:ec2:us-east-1:123456789012:instance/*',
    patternB: 'arn:aws:ec2:us-east-1:123456789012:volume/*',
    overlaps: false
  },
  {
    name: 'global_star_overlaps_everything',
    patternA: '*',
    patternB: 'arn:aws:ec2:us-east-1:123456789012:instance/i-0abcd1234ef567890',
    overlaps: true
  },
  {
    name: 'arn_star_overlaps_specific_arn',
    patternA: 'arn:aws:*:*:*:*',
    patternB: 'arn:aws:lambda:us-east-1:123456789012:function:my-function',
    overlaps: true
  },
  {
    name: 'arn_star_does_not_overlap_non_arn_star',
    patternA: 'arn:aws:*:*:*:*',
    patternB: '*',
    overlaps: true
  },
  {
    name: 'question_mark_single_char_overlap',
    patternA: 'arn:aws:ec2:us-east-1:123456789012:instance/i-0????',
    patternB: 'arn:aws:ec2:us-east-1:123456789012:instance/i-0abcd',
    overlaps: true
  },
  {
    name: 'question_mark_length_mismatch_no_overlap',
    patternA: 'arn:aws:ec2:us-east-1:123456789012:instance/i-0????',
    patternB: 'arn:aws:ec2:us-east-1:123456789012:instance/i-0abcde',
    overlaps: false
  },
  {
    name: 'prefix_star_overlaps_prefix_literal',
    patternA: 'arn:aws:lambda:us-east-1:123456789012:function:prod-*',
    patternB: 'arn:aws:lambda:us-east-1:123456789012:function:prod-api',
    overlaps: true
  },
  {
    name: 'two_prefixes_disjoint_no_overlap',
    patternA: 'arn:aws:lambda:us-east-1:123456789012:function:prod-*',
    patternB: 'arn:aws:lambda:us-east-1:123456789012:function:dev-*',
    overlaps: false
  },
  {
    name: 'mid_string_star_overlap',
    patternA: 'arn:aws:lambda:us-east-1:123456789012:function:*api*',
    patternB: 'arn:aws:lambda:us-east-1:123456789012:function:prod-api-v2',
    overlaps: true
  },
  {
    name: 'mid_string_star_disjoint',
    patternA: 'arn:aws:lambda:us-east-1:123456789012:function:*banana*',
    patternB: 'arn:aws:lambda:us-east-1:123456789012:function:*apple*',
    overlaps: true
  },
  {
    name: 'ec2_partition_wildcard_overlaps_aws_partition',
    patternA: 'arn:*:ec2:us-east-1:123456789012:instance/*',
    patternB: 'arn:aws:ec2:us-east-1:123456789012:instance/i-0abcd1234ef567890',
    overlaps: true
  },
  {
    name: 'partition_mismatch_no_overlap_if_no_wildcards',
    patternA: 'arn:aws-us-gov:ec2:us-gov-west-1:123456789012:instance/*',
    patternB: 'arn:aws:ec2:us-east-1:123456789012:instance/*',
    overlaps: false
  },

  {
    name: 's3_bucket_exact_vs_object_prefix_no_overlap',
    patternA: 'arn:aws:s3:::my-bucket',
    patternB: 'arn:aws:s3:::my-bucket/*',
    overlaps: false
  },
  {
    name: 's3_object_prefix_overlap_with_literal_object',
    patternA: 'arn:aws:s3:::my-bucket/folder/*',
    patternB: 'arn:aws:s3:::my-bucket/folder/file.txt',
    overlaps: true
  },
  {
    name: 's3_object_prefix_disjoint_folders_no_overlap',
    patternA: 'arn:aws:s3:::my-bucket/folderA/*',
    patternB: 'arn:aws:s3:::my-bucket/folderB/*',
    overlaps: false
  },
  {
    name: 's3_suffix_wildcard_overlap',
    patternA: 'arn:aws:s3:::my-bucket/*.json',
    patternB: 'arn:aws:s3:::my-bucket/data.json',
    overlaps: true
  },
  {
    name: 's3_suffix_wildcard_disjoint_extensions_no_overlap',
    patternA: 'arn:aws:s3:::my-bucket/*.json',
    patternB: 'arn:aws:s3:::my-bucket/data.txt',
    overlaps: false
  },
  {
    name: 's3_two_prefixes_no_overlap',
    patternA: 'arn:aws:s3:::my-bucket/banana*',
    patternB: 'arn:aws:s3:::my-bucket/apple*',
    overlaps: false
  },
  {
    name: 's3_prefix_overlaps_suffix_glob',
    patternA: 'arn:aws:s3:::my-bucket/banana*',
    patternB: 'arn:aws:s3:::my-bucket/*.json',
    overlaps: true
  },
  {
    name: 's3_prefix_overlaps_mid_glob',
    patternA: 'arn:aws:s3:::my-bucket/banana*',
    patternB: 'arn:aws:s3:::my-bucket/*na*.json',
    overlaps: true
  },
  {
    name: 's3_question_mark_single_char_segment_overlap',
    patternA: 'arn:aws:s3:::my-bucket/file-?.json',
    patternB: 'arn:aws:s3:::my-bucket/file-a.json',
    overlaps: true
  },
  {
    name: 's3_question_mark_length_mismatch_no_overlap',
    patternA: 'arn:aws:s3:::my-bucket/file-?.json',
    patternB: 'arn:aws:s3:::my-bucket/file-aa.json',
    overlaps: false
  },
  {
    name: 's3_star_can_cross_slashes_overlap',
    patternA: 'arn:aws:s3:::my-bucket/folder/*',
    patternB: 'arn:aws:s3:::my-bucket/folder/sub/leaf.txt',
    overlaps: true
  },
  {
    name: 's3_star_cross_slashes_overlap_with_exact_folder',
    patternA: 'arn:aws:s3:::my-bucket/folder*',
    patternB: 'arn:aws:s3:::my-bucket/folder/sub/leaf.txt',
    overlaps: true
  },
  {
    name: 's3_star_cross_slashes_disjoint_prefix_no_overlap',
    patternA: 'arn:aws:s3:::my-bucket/folder*',
    patternB: 'arn:aws:s3:::my-bucket/other/sub/leaf.txt',
    overlaps: false
  },
  {
    name: 's3_double_star_like_patterns_overlap',
    patternA: 'arn:aws:s3:::my-bucket/*/2025/*',
    patternB: 'arn:aws:s3:::my-bucket/reports/2025/jan/file.json',
    overlaps: true
  },
  {
    name: 's3_double_star_like_patterns_no_overlap',
    patternA: 'arn:aws:s3:::my-bucket/*/2025/*',
    patternB: 'arn:aws:s3:::my-bucket/reports/2024/jan/file.json',
    overlaps: false
  },
  {
    name: 's3_bucket_wildcard_overlaps_specific_bucket_object',
    patternA: 'arn:aws:s3:::*/*',
    patternB: 'arn:aws:s3:::my-bucket/path/file.txt',
    overlaps: true
  },
  {
    name: 's3_bucket_wildcard_object_suffix_overlap',
    patternA: 'arn:aws:s3:::*/*.json',
    patternB: 'arn:aws:s3:::my-bucket/path/file.json',
    overlaps: true
  },
  {
    name: 's3_bucket_name_question_mark_overlap',
    patternA: 'arn:aws:s3:::my-bucket-????/*',
    patternB: 'arn:aws:s3:::my-bucket-2026/file.txt',
    overlaps: true
  },
  {
    name: 's3_bucket_name_question_mark_length_mismatch_no_overlap',
    patternA: 'arn:aws:s3:::my-bucket-????/*',
    patternB: 'arn:aws:s3:::my-bucket-20260/file.txt',
    overlaps: false
  },

  {
    name: 'kms_key_vs_alias_no_overlap',
    patternA: 'arn:aws:kms:us-east-1:123456789012:key/*',
    patternB: 'arn:aws:kms:us-east-1:123456789012:alias/*',
    overlaps: false
  },
  {
    name: 'kms_region_wildcard_overlap',
    patternA: 'arn:aws:kms:*:123456789012:key/*',
    patternB: 'arn:aws:kms:us-west-2:123456789012:key/abcd-1234',
    overlaps: true
  },
  {
    name: 'sqs_queue_name_prefix_overlap',
    patternA: 'arn:aws:sqs:us-east-1:123456789012:prod-*',
    patternB: 'arn:aws:sqs:us-east-1:123456789012:prod-orders',
    overlaps: true
  },
  {
    name: 'sqs_queue_name_prefix_disjoint_no_overlap',
    patternA: 'arn:aws:sqs:us-east-1:123456789012:prod-*',
    patternB: 'arn:aws:sqs:us-east-1:123456789012:dev-orders',
    overlaps: false
  },

  {
    name: 'overlap_due_to_trailing_star_spanning_additional_segments',
    patternA: 'arn:aws:execute-api:us-east-1:123456789012:api-id/*',
    patternB: 'arn:aws:execute-api:us-east-1:123456789012:api-id/prod/GET/resource',
    overlaps: true
  },
  {
    name: 'no_overlap_due_to_fixed_segment_before_star',
    patternA: 'arn:aws:execute-api:us-east-1:123456789012:api-id/prod/*',
    patternB: 'arn:aws:execute-api:us-east-1:123456789012:api-id/dev/GET/resource',
    overlaps: false
  }
]

describe('resourceArnsOverlap', () => {
  for (const testCase of resourceArnsOverlapTests) {
    const testFn = testCase.only ? it.only : it
    testFn(testCase.name, () => {
      const result = resourceArnsOverlap(testCase.patternA, testCase.patternB)
      expect(result).toBe(testCase.overlaps)
    })
  }
})

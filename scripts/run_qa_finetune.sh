#!/bin/bash

HOME_DIR=$(pwd)

# Finetune Transformer Model for QA
MODEL_NAME_OR_PATH="deepset/roberta-base-squad2"
BACKBONE_NAME="scan-u-doc_question-answer"

# hyperparameters
SEED=928
BATCH_SIZE=8
MAX_SEQ_LENGTH=256
NUM_TRAIN_EPOCHS=3
WEIGHT_DECAY=0.01
LEARNING_RATE=5e-6
LR_SCHEDULER_TYPE="linear"
WARMUP_RATIO=0.0
NUM_WARMUP_STEPS=365
DOC_STRIDE=128
OPTIMIZER="adamw_hf"
LOGGING_STRATEGY="epoch"
EVALUATION_STRATEGY="epoch"
SAVE_STRATEGY="epoch"
SAVE_TOTAL_LIMIT=1
KEEP_ACCENTS=true
DO_LOWER_CASE=false

# other parameters
ENABLE_FP16=true
ENABLE_BF16=false
ENABLE_IPEX=false
PUSH_TO_HUB=false

TRAIN_FILE="../dataset/df_train.csv"
VALIDATION_FILE="../dataset/df_validation.csv"

OUTPUT_DIR="artifacts/$BACKBONE_NAME"

python qa_finetune.py \
  --overwrite_output_dir \
  --train_file "$TRAIN_FILE" \
  --validation_file "$VALIDATION_FILE" \
  --model_name_or_path "$MODEL_NAME_OR_PATH" \
  --back_bone_name "$BACKBONE_NAME" \
  --logging_strategy "$LOGGING_STRATEGY" \
  --evaluation_strategy "$EVALUATION_STRATEGY" \
  --save_strategy "$SAVE_STRATEGY" \
  --save_total_limit "$SAVE_TOTAL_LIMIT" \
  --keep_accents "$KEEP_ACCENTS" \
  --do_lower_case "$DO_LOWER_CASE" \
  --optim "$OPTIMIZER" \
  --weight_decay "$WEIGHT_DECAY" \
  --per_device_train_batch_size "$BATCH_SIZE" \
  --per_device_eval_batch_size "$BATCH_SIZE" \
  --gradient_accumulation_steps 1 \
  --learning_rate "$LEARNING_RATE" \
  --lr_scheduler_type "$LR_SCHEDULER_TYPE" \
  --warmup_ratio "$WARMUP_RATIO" \
  --warmup_steps "$NUM_WARMUP_STEPS" \
  --num_train_epochs "$NUM_TRAIN_EPOCHS" \
  --max_seq_length "$MAX_SEQ_LENGTH" \
  --doc_stride "$DOC_STRIDE" \
  --seed "$SEED" \
  --output_dir "$OUTPUT_DIR" \
  --fp16 "$ENABLE_FP16" \
  --bf16 "$ENABLE_BF16" \
  --push_to_hub "$PUSH_TO_HUB" \
  --use_ipex "$ENABLE_IPEX"

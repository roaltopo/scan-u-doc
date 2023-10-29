@echo off

set HOME_DIR=%cd%

:: Finetune Transformer Model for QA
set MODEL_NAME_OR_PATH=deepset/roberta-base-squad2
set BACKBONE_NAME=scan-u-doc_question-answer

:: hyperparameters
set SEED=928
set BATCH_SIZE=8
set MAX_SEQ_LENGTH=256
set NUM_TRAIN_EPOCHS=3
set WEIGHT_DECAY=0.01
set LEARNING_RATE=5e-6
set LR_SCHEDULER_TYPE=linear
set WARMUP_RATIO=0.0
set NUM_WARMUP_STEPS=365
set DOC_STRIDE=128
set OPTIMIZER=adamw_hf
set LOGGING_STRATEGY=epoch
set EVALUATION_STRATEGY=epoch
set SAVE_STRATEGY=epoch
set SAVE_TOTAL_LIMIT=1
set KEEP_ACCENTS=True
set DO_LOWER_CASE=False

:: other parameters
set ENABLE_FP16=True
set ENABLE_BF16=False
set ENABLE_IPEX=False
set PUSH_TO_HUB=False

set TRAIN_FILE=../dataset/df_train.csv
set VALIDATION_FILE=../dataset/df_validation.csv

set OUTPUT_DIR=artifacts/%BACKBONE_NAME%

python qa_finetune.py ^
  --overwrite_output_dir ^
  --train_file %TRAIN_FILE% ^
  --validation_file %VALIDATION_FILE% ^
  --model_name_or_path %MODEL_NAME_OR_PATH% ^
  --back_bone_name %BACKBONE_NAME% ^
  --logging_strategy %LOGGING_STRATEGY% ^
  --evaluation_strategy %EVALUATION_STRATEGY% ^
  --save_strategy %SAVE_STRATEGY% ^
  --save_total_limit %SAVE_TOTAL_LIMIT% ^
  --keep_accents %KEEP_ACCENTS% ^
  --do_lower_case %DO_LOWER_CASE% ^
  --optim %OPTIMIZER% ^
  --weight_decay %WEIGHT_DECAY% ^
  --per_device_train_batch_size %BATCH_SIZE% ^
  --per_device_eval_batch_size %BATCH_SIZE% ^
  --gradient_accumulation_steps 1 ^
  --learning_rate %LEARNING_RATE% ^
  --lr_scheduler_type %LR_SCHEDULER_TYPE% ^
  --warmup_ratio %WARMUP_RATIO% ^
  --warmup_steps %NUM_WARMUP_STEPS% ^
  --num_train_epochs %NUM_TRAIN_EPOCHS% ^
  --max_seq_length %MAX_SEQ_LENGTH% ^
  --doc_stride %DOC_STRIDE% ^
  --seed %SEED% ^
  --output_dir %OUTPUT_DIR% ^
  --fp16 %ENABLE_FP16% ^
  --bf16 %ENABLE_BF16% ^
  --push_to_hub %PUSH_TO_HUB% ^
  --use_ipex %ENABLE_IPEX%

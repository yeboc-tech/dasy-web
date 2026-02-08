#!/usr/bin/env python3
"""
PDF를 이미지로 변환하는 스크립트

PDF 파일의 첫 번째 페이지를 추출하여:
- 본문용 이미지 (최대 너비 800px)
- 썸네일용 이미지 (최대 너비 300px)
로 저장합니다.

파일명 패턴:
- 입력: {과목}_{학년}_{연도}_{월}_{시험유형}_{지역}_{문제}.pdf
- 출력: {과목}_{학년}_{연도}_{월}_{시험유형}.png
        {과목}_{학년}_{연도}_{월}_{시험유형}_thumbnail.png
"""

import os
import sys
import re
from pathlib import Path
from pdf2image import convert_from_path
from PIL import Image

# 설정
INPUT_DIRS = [
    '.input/ebs',      # 고2, 고3
    '.input/ebs-고1',  # 고1
]
OUTPUT_DIR = 'public/images/past-exam'
MAIN_IMAGE_MAX_WIDTH = 800
THUMBNAIL_MAX_WIDTH = 300
DPI = 150  # PDF 렌더링 해상도

def extract_exam_id(filename: str) -> str | None:
    """
    파일명에서 시험 ID 추출
    경제_고2_2006_06_학평_인천_문제.pdf -> 경제_고2_2006_06_학평
    """
    # _문제.pdf 또는 _해설.pdf 제거
    base = filename.replace('.pdf', '')

    # 패턴: {과목}_{학년}_{연도}_{월}_{시험유형}_{지역}_{문제/해설}
    # 뒤에서 두 개(_지역_문제 또는 _지역_해설)를 제거
    parts = base.split('_')

    if len(parts) < 7:
        print(f"  [SKIP] 파일명 패턴 불일치: {filename}")
        return None

    # 마지막이 문제 또는 해설인지 확인
    if parts[-1] not in ['문제', '해설']:
        print(f"  [SKIP] 문제/해설 파일이 아님: {filename}")
        return None

    # 문제 파일만 처리
    if parts[-1] != '문제':
        return None

    # 시험 ID: 지역과 문제/해설 제거 (마지막 2개 제거)
    exam_id = '_'.join(parts[:-2])

    return exam_id


def resize_image(img: Image.Image, max_width: int) -> Image.Image:
    """이미지를 최대 너비에 맞게 리사이즈"""
    if img.width <= max_width:
        return img

    ratio = max_width / img.width
    new_height = int(img.height * ratio)
    return img.resize((max_width, new_height), Image.Resampling.LANCZOS)


def process_pdf(pdf_path: Path, output_dir: Path, processed_ids: set) -> bool:
    """PDF 파일을 처리하여 이미지 생성"""
    filename = pdf_path.name
    exam_id = extract_exam_id(filename)

    if not exam_id:
        return False

    # 이미 처리된 시험 ID인지 확인 (중복 방지)
    if exam_id in processed_ids:
        print(f"  [SKIP] 이미 처리됨: {exam_id}")
        return False

    # 출력 파일 경로
    main_image_path = output_dir / f"{exam_id}.png"
    thumbnail_path = output_dir / f"{exam_id}_thumbnail.png"

    # 이미 존재하면 스킵
    if main_image_path.exists() and thumbnail_path.exists():
        print(f"  [SKIP] 이미 존재: {exam_id}")
        processed_ids.add(exam_id)
        return False

    try:
        # PDF 첫 페이지만 변환
        print(f"  [CONVERT] {filename} -> {exam_id}")
        images = convert_from_path(
            pdf_path,
            first_page=1,
            last_page=1,
            dpi=DPI
        )

        if not images:
            print(f"  [ERROR] 이미지 변환 실패: {filename}")
            return False

        first_page = images[0]

        # RGB로 변환 (PDF가 CMYK일 수 있음)
        if first_page.mode != 'RGB':
            first_page = first_page.convert('RGB')

        # 본문용 이미지 저장
        main_image = resize_image(first_page, MAIN_IMAGE_MAX_WIDTH)
        main_image.save(main_image_path, 'PNG', optimize=True)

        # 썸네일 저장
        thumbnail = resize_image(first_page, THUMBNAIL_MAX_WIDTH)
        thumbnail.save(thumbnail_path, 'PNG', optimize=True)

        processed_ids.add(exam_id)
        print(f"  [OK] {exam_id} (본문: {main_image.width}x{main_image.height}, 썸네일: {thumbnail.width}x{thumbnail.height})")
        return True

    except Exception as e:
        print(f"  [ERROR] {filename}: {e}")
        return False


def main():
    # 프로젝트 루트로 이동
    project_root = Path(__file__).parent.parent
    os.chdir(project_root)

    # 출력 디렉토리 생성
    output_dir = Path(OUTPUT_DIR)
    output_dir.mkdir(parents=True, exist_ok=True)

    processed_ids = set()
    total_processed = 0
    total_skipped = 0
    total_errors = 0

    for input_dir in INPUT_DIRS:
        input_path = Path(input_dir)

        if not input_path.exists():
            print(f"[WARN] 입력 디렉토리 없음: {input_dir}")
            continue

        print(f"\n[INFO] 처리 중: {input_dir}")

        pdf_files = sorted(input_path.glob('*.pdf'))
        print(f"[INFO] PDF 파일 수: {len(pdf_files)}")

        for pdf_path in pdf_files:
            result = process_pdf(pdf_path, output_dir, processed_ids)
            if result:
                total_processed += 1
            elif result is False:
                total_skipped += 1

    print(f"\n[DONE] 처리 완료!")
    print(f"  - 변환됨: {total_processed}")
    print(f"  - 스킵됨: {total_skipped}")
    print(f"  - 총 시험 ID: {len(processed_ids)}")
    print(f"  - 출력 디렉토리: {output_dir.absolute()}")


if __name__ == '__main__':
    main()

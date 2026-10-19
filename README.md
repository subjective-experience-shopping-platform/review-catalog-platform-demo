# Review Catalog Platform Demo

`review-catalog-platform`과 `meta-search mcp`의 데모를 제공하는 레포지토리입니다. `review-catalog-platform`의 과도한 EC2 청구 비용을 방지하기 위해 KR-SBERT(텍스트 임베딩 모델)과 같은 무거운 의존성을 의도적으로 제거했습니다. AWS Lambda로 가볍게 데모를 시연하는 것이 목적입니다.

본 데모에서는 몇 가지 내용을 의도적으로 제거하거나 단순화했습니다.

- **데이터 확장 제한**: 이 데모는 [속성기반 감정분석 데이터셋](https://aihub.or.kr/aihubdata/data/view.do?dataSetSn=71603)에서 추출한 데이터 중 모니터 9개만 검색하고 활용하도록 범위를 제한합니다. 새로운 상품을 추가하는 기능과 인터넷 검색 기능은 저작권법 준수를 위하여 의도적으로 제외했습니다.
- **판매 속성은 더미데이터입니다**: 이 데모에서 사용된 속성기반 감정분석 데이터셋에는 상품의 배송 정보와 같은 판매 속성이 없습니다. 데모에서 사용된 판매 속성 정보는 그럴듯하게 만든 더미데이터입니다.
- **메인 아키텍쳐 변화**: 기존 AWS EC2에서 모놀로식으로 처리하던 내용을 gh-pages로 Frontend를 호스팅하며 Backend는 두 개의 AWS Lambda로, DB는 AWS S3에서 Sqlite 단일 파일로서 관리합니다.
- **텍스트 임베딩 및 군집화 제거**: `review-catalog-platform`의 군집화로 도출한 exact-match table만을 이용하여 정규화를 수행합니다. 이에 따라 기존 서비스 대비 28%의 체감 속성이 정규화에 실패하고 원 상태를 유지합니다.
- **DB 단순화**: 기존 시스템은 DuckDB를 이용해 리뷰를, PostgreSQL를 이용해 운영을 수행하였습니다. 하지만 본 데모에서는 SQLite3로 통합 관리합니다.

위 내용을 제외한 대부분의 기능은 `review-catalog-platform`과 `meta-search` 레포지토리 기능과 코드를 그대로 사용합니다.


## 실행 및 배포

### 로컬 실행

```bash
uv sync --frozen
cp .env.example .env  # 이미 .env가 있다면 이 코드를 실행하지 말아야 합니다. 덮어써집니다.
CATALOG_PATH="$PWD/data/catalog.sqlite" PYTHONPATH=backend \
  uv run --env-file .env uvicorn demo.app:app --host 127.0.0.1 --port 8000 --no-access-log
```

새로운 터미널에서 Frontend 서버를 열어 확인할 수 있습니다.

```bash
npm ci --prefix frontend
VITE_API_URL=http://127.0.0.1:8000 npm run dev --prefix frontend
```

`http://127.0.0.1:5173/review-catalog-platform-demo/`에서 확인합니다. 이때 몇 가지 주의사항이 있습니다.

- `.env`의 `SESSION_SIGNING_SECRET`은 충분히 긴 임의 값으로 설정합니다. AWS 배포 스크립트가 없으면 자동 생성합니다.
- 로컬 실행도 `.env`의 `AUDIT_BUCKET`과 해당 버킷 쓰기 권한이 있는 AWS 인증이 필요합니다. 저장소를 설정하지 않으면 `AUDIT_UNAVAILABLE`로 처리를 거부합니다.
- 저장소가 준비된 상태에서 자리표시자 키를 사용하면 두 생성 경로가 `API_KEY_REQUIRED`를 반환합니다.

### AWS 배포

```bash
aws login
uv run python scripts/package_lambda.py
uv run python scripts/deploy.py
uv run python scripts/smoke.py
```

`infra/template.py`에서 재현 가능한 CloudFormation을 생성합니다. 배포 결과는 무시된 `deployment.json`과 `frontend/.env.local`에 기록됩니다. 반드시 동일하게 설정해야 하는 것은 아니지만 본 프로젝트에서는 아래 설정을 사용했습니다.

- 스택: `review-catalog-platform-demo-storage`, `review-catalog-platform-demo`
- 리전: `ap-northeast-2`
- 함수: `review-catalog-platform-demo-report`, `review-catalog-platform-demo-chat`
- 각 512MB / 최대 300초 / provisioned concurrency 없음
- API Gateway: Regional REST, `STREAM`, 경로별 초당 1개 / burst 3 제한
- 카탈로그 S3: 퍼블릭 액세스 차단·암호화·버전 관리, Lambda는 해당 카탈로그 객체 읽기 권한 보유
- 보안 기록 S3: 별도 비공개 버킷, AES256 암호화, HTTPS 강제, 90일 수명 주기. Lambda는 종류별 prefix에 조건부 PutObject만 가능하며 읽기·삭제 권한 없음
- 애플리케이션 요청 본문/모델 출력과 API Gateway 실행 본문 로그 비활성화, 런타임 로그 보관 7일

## 라이선스

프로젝트 코드는 [GNU GPL 3.0](LICENSE)을 따릅니다. 외부 데이터셋과 모델의 이용 조건은 각 원본 제공처의 조건을 따릅니다.

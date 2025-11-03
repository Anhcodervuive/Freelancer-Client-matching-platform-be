# Các lựa chọn AI cho kiểm duyệt job post

Tài liệu này tổng hợp các hướng triển khai kiểm duyệt nội dung job post bằng AI ở nhiều mức độ khác nhau: dùng API có sẵn, tận dụng mô hình được lưu trữ (hosted) và tự huấn luyện mô hình nội bộ. Mỗi mục liệt kê ưu/nhược điểm, tình huống áp dụng và gợi ý các bước tích hợp thực tế.

## 1. Dịch vụ kiểm duyệt được quản lý (Managed Moderation API)
Các dịch vụ này phù hợp khi cần khởi động nhanh, không có dữ liệu gán nhãn và muốn giảm tải vận hành mô hình.

### 1.1. Các lựa chọn miễn phí hoặc nhiều free-tier
- **Google Perspective API (Free tier rộng rãi)**
  - **Giới hạn miễn phí:** 1 triệu request/ngày (theo quota mặc định), phù hợp để prototyping hoặc vận hành ở quy mô nhỏ mà không phát sinh phí.
  - **Lưu ý:** Cần đăng ký API key qua Google Cloud nhưng không bắt buộc nhập thông tin thanh toán ngay.
- **Moderation API của Hugging Face Inference (Free tier cộng đồng)**
  - **Giới hạn miễn phí:** 30 request/phút với mô hình community (ví dụ `facebook/roberta-hate-speech-dynabench`).
  - **Lưu ý:** Hạn mức dùng chung nên có thể bị rate limit giờ cao điểm; có thể tự deploy bằng `text-classification` pipeline trên Spaces nếu muốn chủ động hơn.
- **Open-source models + hạ tầng tự host (chi phí hạ tầng là của bạn)**
  - **Ví dụ mô hình:** `unitary/toxic-bert`, `facebook/roberta-hate-speech-dynabench`, `ProtectAI/deberta-v3-base-prompt-injection`.
  - **Ưu điểm:** Mô hình hoàn toàn miễn phí, có thể chạy trên máy cá nhân hoặc server nội bộ; không phụ thuộc quota nhà cung cấp.
  - **Nhược điểm:** Phải tự chuẩn bị tài nguyên (CPU/GPU), tối ưu hiệu năng và bảo trì.
- **LAION Open Assistant Guard / LLaMA Guard (mở nguồn)**
  - **Giới hạn miễn phí:** Không có phí bản quyền; có thể triển khai trên server của bạn.
  - **Lưu ý:** Mô hình tương đối nặng, cần ít nhất GPU tầm trung nếu muốn latency thấp; nên bật batching và caching để tiết kiệm tài nguyên.

> 💡 **Mẹo:** Ngay cả với các lựa chọn free-tier, bạn vẫn nên cấu hình cơ chế fallback (ví dụ chuyển job sang review thủ công khi request thất bại) và log rõ nguyên nhân lỗi để tránh “mất job” khi vượt quota.

- **OpenAI Moderation (`omni-moderation-latest`)**
  - **Cách dùng:** Gửi `POST` đến endpoint `/v1/moderations` kèm `input` là nội dung job (title + description). Nhận về điểm số cho từng danh mục (sexual, hate, self-harm, violence...).
  - **Ưu điểm:** Chính sách cập nhật thường xuyên, hỗ trợ nhiều ngôn ngữ, latency thấp.
  - **Nhược điểm:** Dữ liệu phải đi qua máy chủ OpenAI; cần thiết lập caching và quota phù hợp.
  - **Gợi ý tích hợp:** Sau khi user tạo job, đẩy vào queue -> worker gọi API -> so sánh điểm với ngưỡng -> cập nhật trạng thái `PUBLISHED/PAUSED/REJECTED`.

- **Azure Content Safety**
  - **Cách dùng:** Tạo resource "Content Safety" trong Azure, gọi endpoint `/contentsafety/text:analyze` với JSON chứa `text`. Nhận về mức độ severity (0-4) cho các loại rủi ro.
  - **Ưu điểm:** Tuân thủ tiêu chuẩn Azure, dễ tích hợp khi hệ thống đã nằm trên Azure.
  - **Nhược điểm:** Phải quản lý khóa Azure, chi phí tính theo số ký tự.
  - **Gợi ý tích hợp:** Map mức độ severity > 2 vào trạng thái `PAUSED`, >3 thì `REJECTED`, đồng thời lưu lý do vào bảng moderation log.

- **Google Perspective API**
  - **Cách dùng:** Gọi endpoint `comments:analyze` với trường `text` và danh sách models (`TOXICITY`, `INSULT`, `THREAT`, ...). Nhận về điểm [0-1].
  - **Ưu điểm:** Mạnh về phát hiện toxic/insult, hỗ trợ nhiều ngôn ngữ.
  - **Nhược điểm:** Không bao phủ đầy đủ các danh mục nhạy cảm khác (sexual, self-harm).
  - **Gợi ý tích hợp:** Dùng kết hợp với rule riêng cho các policy ngoài phạm vi toxic.

- **AWS Comprehend + Guardrails**
  - **Cách dùng:** Dùng Comprehend để trích sentiment/entity, sau đó cấu hình Guardrails để enforce chính sách.
  - **Ưu điểm:** Linh hoạt, có thể chain nhiều dịch vụ AWS.
  - **Nhược điểm:** Setup phức tạp, cần kiến thức AWS sâu.

## 2. Mô hình tùy chỉnh trên nền tảng hosted
Phù hợp khi policy nội bộ phức tạp và bạn muốn kiểm soát quyết định nhưng vẫn tận dụng hạ tầng cloud.

- **OpenAI GPT-4o mini / GPT-4.1 với prompt phân loại**
  - **Cách dùng:** Tạo prompt chuẩn mô tả guideline, yêu cầu mô hình trả JSON (approve/soft_block/reject + lý do). Có thể few-shot bằng ví dụ thực tế.
  - **Ưu/nhược điểm:** Linh hoạt, dễ chỉnh policy bằng prompt; chi phí cao hơn, latency lớn hơn so với model chuyên dụng.

- **Anthropic Claude Sonnet**
  - **Cách dùng:** Sử dụng constitutional prompting, liệt kê chính sách và yêu cầu mô hình tự đánh giá.
  - **Ưu điểm:** Giải thích chi tiết, xử lý đoạn mô tả dài tốt.
  - **Nhược điểm:** Giá thành, cần quản lý prompt để tránh drift.

- **Google Vertex AI AutoML Text**
  - **Cách dùng:** Upload dữ liệu CSV (text + label), huấn luyện bằng AutoML, deploy thành endpoint REST.
  - **Ưu điểm:** Không cần viết code huấn luyện, hỗ trợ evaluate model.
  - **Nhược điểm:** Cần tối thiểu vài nghìn mẫu gán nhãn; dữ liệu phải lưu trên GCP.

## 3. Phương án tự vận hành/on-premise
Khi yêu cầu bảo mật cao, dữ liệu không được rời khỏi hệ thống hoặc bạn muốn tối ưu chi phí dài hạn.

- **Transformer mã nguồn mở (RoBERTa, DeBERTa, `unitary/toxic-bert`, `LLaMA Guard`, ...)**
  - **Cách dùng:** Tải mô hình từ HuggingFace, chạy bằng `transformers` + PyTorch. Có thể fine-tune thêm bằng dữ liệu nội bộ.
  - **Ưu điểm:** Kiểm soát hoàn toàn mô hình và dữ liệu.
  - **Nhược điểm:** Cần GPU/CPU mạnh, phải tự cập nhật mô hình định kỳ.

- **Mô hình guard dựa trên LLaMA/Vicuna**
  - **Cách dùng:** Triển khai dưới dạng service nội bộ (FastAPI, Triton). Prompt mô hình với guideline và yêu cầu output structured.
  - **Ưu/nhược điểm:** Khả năng hiểu ngữ cảnh tốt, nhưng tốn tài nguyên và cần tối ưu hóa để đạt latency hợp lý.

## 4. Khi nào nên tự huấn luyện (self-train)
Chỉ nên tự huấn luyện khi đáp ứng điều kiện:

1. **Có dữ liệu gán nhãn đủ lớn**: tối thiểu vài nghìn job post đã được con người phân loại (chấp nhận/từ chối/tạm treo).
2. **Yêu cầu bảo mật hoặc chính sách nội bộ** khiến không thể gửi dữ liệu ra bên ngoài.
3. **Đội ngũ có năng lực ML** để duy trì quy trình training, đánh giá, triển khai.

### Các bước huấn luyện đề xuất
1. **Chuẩn hóa dữ liệu**: loại bỏ thông tin nhạy cảm, token hóa (WordPiece/BPE), chia train/validation/test.
2. **Chọn mô hình nền**: DeBERTa-base, RoBERTa-large hoặc các mô hình đa ngôn ngữ nếu job nhiều tiếng Việt.
3. **Fine-tune** với loss cross-entropy cho bài toán phân loại 3 nhãn (`APPROVE`, `SOFT_BLOCK`, `REJECT`).
4. **Đánh giá** bằng F1-score, Precision/Recall từng lớp; điều chỉnh trọng số loss nếu dữ liệu mất cân bằng.
5. **Triển khai** qua REST/gRPC service, thêm cơ chế A/B test so sánh với mô hình cũ.
6. **Vòng lặp cải thiện**: log lại quyết định của reviewer, các case false positive/negative để tái huấn luyện định kỳ.

### Thuật toán/kiến trúc phụ trợ
- **Heuristic + ML kết hợp**: lấy điểm mô hình AI + các rule (độ dài mô tả, bất thường về lương) đưa vào logistic regression hoặc gradient boosting để ra quyết định cuối.
- **Active learning**: ưu tiên gửi các case “độ chắc chắn thấp” cho reviewer nhằm thu thập nhãn hiệu quả.

## 5. Quy trình triển khai gợi ý (publish trước, kiểm duyệt sau)
1. **Bước request**: user tạo/cập nhật job -> API lưu trạng thái tạm `PUBLISHED_PENDING_REVIEW` và đẩy job vào queue `job-moderation`.
2. **Worker moderation**: đọc job, gọi mô hình (API hoặc self-hosted), nhận điểm + nhãn.
3. **Ra quyết định**:
   - Điểm thấp -> giữ nguyên `PUBLISHED`.
   - Điểm trung bình -> chuyển `PAUSED`, gửi thông báo yêu cầu chỉnh sửa.
  - Điểm cao -> `REJECTED`, lưu lý do chi tiết.
4. **Dashboard nội bộ**: staff xem danh sách job bị chặn, có thể override nếu cần.
5. **Ghi log & giám sát**: lưu response thô, mức điểm, người phê duyệt thủ công để phục vụ audit.

### Quy trình chi tiết với OpenAI Moderation (`omni-moderation-latest`)
1. **User gửi request tạo job**
   - Controller nhận payload, ép trạng thái về `PUBLISHED_PENDING_REVIEW` (hoặc tương đương) bất kể client truyền gì.
   - Service lưu job vào DB, ghi nhận các trường cần kiểm duyệt (`title`, `description`, `skills`, `attachments`).
2. **Đẩy job vào hàng đợi kiểm duyệt**
   - Sau khi transaction thành công, service đẩy message lên queue `job-moderation` chứa `jobPostId`, snapshot nội dung và `language` (nếu có) để worker không phải query lại nhiều lần.
   - Đồng thời trả response cho client rằng job đã được đăng tạm thời và đang chờ kiểm duyệt.
3. **Worker gọi OpenAI**
   - Worker lấy job khỏi queue, gọi endpoint `POST /v1/moderations` với `model: "omni-moderation-latest"` và `input` là phần nội dung đã chuẩn hóa.
   - Lưu log request/response (ẩn token) nhằm phục vụ audit.
4. **Đánh giá và cập nhật trạng thái**
   - Response của OpenAI có cấu trúc `results[0].categories` (true/false) và `results[0].category_scores` (xác suất 0-1 cho từng danh mục như `sexual`, `hate/threatening`, `self-harm`...).
   - Lặp qua `category_scores`, lấy **điểm cao nhất** (`maxScore`) và danh mục tương ứng (`maxCategory`). So sánh `maxScore` với ngưỡng nội bộ (ví dụ `>=0.7` -> reject, `0.4-0.7` -> pause, `<0.4` -> publish). Có thể giữ thêm bảng rule riêng nếu muốn đặt ngưỡng khác nhau cho từng category.
   - Khi cập nhật bảng `job_post`, nên lưu:
     - `moderationScore` = `maxScore` (hoặc lưu dạng JSON nếu muốn xem đầy đủ từng category).
     - `moderationCategory` = `maxCategory` (để biết lý do chính khiến job bị flag).
     - `moderationSummary` = đoạn mô tả ngắn cho reviewer, ví dụ "High sexual content score (0.82)". Có thể generate summary từ template + thông tin category/score.
   - Nếu trạng thái thay đổi so với lúc tạo (ví dụ từ `PUBLISHED_PENDING_REVIEW` sang `PAUSED/REJECTED`), phát sự kiện (WebSocket/email) thông báo cho chủ job và ghi log phục vụ audit.
5. **Fallback & escalate**
   - Nếu API trả lỗi (timeout, 5xx), worker retry với backoff; quá số lần retry thì chuyển job sang `PAUSED` và gắn cờ để reviewer thủ công kiểm tra.
   - Các job bị `PAUSED/REJECTED` sẽ xuất hiện trên dashboard nội bộ để nhân viên kiểm duyệt xem xét và override nếu cần.
6. **Theo dõi & cải thiện**
   - Tổng hợp thống kê tỷ lệ reject/pauses theo tuần, phân tích false positive để điều chỉnh ngưỡng.
   - Thu thập job đã được reviewer xác nhận đúng/sai để làm dữ liệu huấn luyện nếu muốn fine-tune mô hình riêng trong tương lai.

### Quy trình chi tiết với Google Perspective API
1. **User tạo/cập nhật job** tương tự luồng OpenAI: job được lưu với trạng thái `PUBLISHED_PENDING_REVIEW` và đẩy vào queue.
2. **Worker gọi Perspective**
   - Worker gửi `POST` tới endpoint `comments:analyze` kèm body:
     ```json
     {
       "comment": { "text": "<nội dung job>" },
       "languages": ["vi", "en"],
       "requestedAttributes": {
         "TOXICITY": {},
         "SEVERE_TOXICITY": {},
         "SEXUAL_EXPLICIT": {},
         "INSULT": {},
         "THREAT": {},
         "PROFANITY": {}
       }
     }
     ```
   - Bạn có thể tinh chỉnh danh sách `requestedAttributes` và `languages` bằng biến môi trường (xem bên dưới) để phù hợp dataset của mình.
3. **Chuẩn hóa điểm**
   - Perspective trả về `attributeScores.<ATTRIBUTE>.summaryScore.value` (0-1). Worker map các điểm này vào `category_scores`, lấy điểm cao nhất và so sánh với ngưỡng nội bộ (`JOB_MODERATION_PAUSE_THRESHOLD`, `JOB_MODERATION_REJECT_THRESHOLD`).
   - Nếu API không trả về điểm nào (ví dụ nội dung rỗng hoặc attribute không hợp lệ), worker sẽ chuyển job sang `PAUSED` để reviewer kiểm tra.
4. **Ghi log & quyết định**
   - Log sẽ hiển thị provider `perspective`, danh sách attributes và điểm cao nhất để bạn giám sát dễ dàng.
   - Quy tắc cập nhật trạng thái job (`PUBLISHED/PAUSED/REJECTED`) giống OpenAI nên không cần đổi UI/backend.
5. **Fallback**
   - Lỗi tạm thời (429, 5xx) sẽ được retry theo cấu hình queue. Hết số lần retry thì job chuyển sang `PAUSED`.

### Biến môi trường cần cấu hình
- `OPENAI_API_KEY` (**bắt buộc**): khóa truy cập dùng để gọi API. Nếu để trống hoặc không hợp lệ, worker sẽ chuyển job sang trạng thái tạm dừng để chờ kiểm tra thủ công.
- `OPENAI_ORGANIZATION` (**tùy chọn**): chỉ cần thiết nếu tài khoản OpenAI của bạn phân quyền theo organization. Có thể bỏ trống khi bạn chỉ có một API key cá nhân.
- `OPENAI_PROJECT` (**tùy chọn**): dùng cho các workspace mới của OpenAI. Nếu API key của bạn không đính kèm project, có thể để trống, worker sẽ tự động bỏ qua header này.
- `JOB_MODERATION_MODEL`, `JOB_MODERATION_PAUSE_THRESHOLD`, `JOB_MODERATION_REJECT_THRESHOLD`...: tinh chỉnh model và ngưỡng nội bộ. Nếu không khai báo, hệ thống dùng mặc định `omni-moderation-latest` với các ngưỡng gợi ý trong tài liệu.
- `JOB_MODERATION_LOG_VERBOSE` (**tùy chọn**, mặc định `true`): bật/tắt log chi tiết tiến trình moderation trên console. Nếu muốn giảm log khi chạy production, đặt giá trị `false`.
- `JOB_MODERATION_WORKER_CONCURRENCY` (**tùy chọn**, mặc định `1`): số job moderation xử lý song song. Để tránh bắn quá nhiều request cùng lúc (dễ dẫn tới lỗi 429), hãy giữ giá trị nhỏ và chỉ tăng khi đã có hạn mức cao hơn từ OpenAI.
- `JOB_MODERATION_PROVIDER` (**tùy chọn**, mặc định `openai`): chọn nhà cung cấp moderation. Đặt `perspective` để dùng Google Perspective API.
- `PERSPECTIVE_API_KEY` (**bắt buộc khi dùng Perspective**): API key tạo từ Google Cloud. Nếu thiếu, worker sẽ chuyển job sang `PAUSED`.
- `PERSPECTIVE_ENDPOINT` (**tùy chọn**): endpoint custom cho Perspective (mặc định `https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze`).
- `PERSPECTIVE_LANGUAGES` (**tùy chọn**): danh sách ngôn ngữ (phân tách bằng dấu phẩy) gửi kèm request. Mặc định `vi,en`.
- `PERSPECTIVE_ATTRIBUTES` (**tùy chọn**): danh sách attribute cần chấm điểm (phân tách bằng dấu phẩy). Mặc định `TOXICITY,SEVERE_TOXICITY,SEXUAL_EXPLICIT,INSULT,THREAT,PROFANITY`.

## 6. Gợi ý vận hành
- Thiết lập **retry/backoff** cho queue khi API ngoài bị lỗi.
- Hệ thống hiện tự động nhận diện các lỗi tạm thời như `429 Too Many Requests` và retry với backoff. Nếu hết lượt retry mà vẫn thất bại, job sẽ được chuyển sang `PAUSED` để đội ngũ kiểm duyệt xử lý thủ công.
- Dùng **rate limiting/caching** với các job bị chỉnh sửa nhiều lần để tối ưu chi phí.
- Đặt **alert** khi tỉ lệ reject tăng bất thường hoặc khi worker backlog lớn.
- Luôn duy trì kênh phản hồi từ đội kiểm duyệt để điều chỉnh ngưỡng và chính sách kịp thời.

### FAQ: Vì sao đổi sang API key khác vẫn gặp lỗi 429?
Ngay cả khi bạn tạo API key mới ở tài khoản khác, lỗi `429 Too Many Requests` vẫn có thể xuất hiện nếu rơi vào một trong các tình huống dưới đây:

1. **Tài khoản mới chưa kích hoạt thanh toán**: Những tài khoản chưa thêm phương thức thanh toán hoặc chưa nạp credit thường bị giới hạn ở quota cực thấp (thậm chí ~0). Bạn cần hoàn tất bước billing để OpenAI mở hạn mức chuẩn.
2. **Tài khoản thuộc cùng tổ chức**: Nếu cả hai API key đều nằm trong cùng một organization/workspace, chúng vẫn dùng chung quota. Khi tổ chức đã đạt giới hạn, key mới cũng bị 429.
3. **Giới hạn vùng địa lý hoặc kiểm soát rủi ro**: Một số quốc gia/khu vực bị áp hạn mức thấp hơn, hoặc tài khoản mới cần qua bước review thủ công. Trong thời gian đó, mọi request ngoài dashboard có thể bị từ chối.
4. **Quota tháng đã cạn**: OpenAI giới hạn tổng chi tiêu mỗi tháng. Nếu trước đây bạn đã dùng hết hạn mức, key mới sẽ kế thừa trạng thái “hết quota” đến kỳ thanh toán tiếp theo.
5. **Burst quá nhanh ngay sau khi khởi tạo**: Worker có thể bắn nhiều request trong vài giây khiến hệ thống bảo vệ coi đó là spam. Hãy giảm `JOB_MODERATION_WORKER_CONCURRENCY`, bật retry/backoff và thêm độ trễ ngẫu nhiên.

Để xác định nguyên nhân cụ thể, hãy kiểm tra dashboard `Usage` và `Billing` của tài khoản mới. Nếu mọi thiết lập đã ổn nhưng vẫn gặp 429 dài hạn, bạn cần liên hệ hỗ trợ OpenAI kèm thời điểm, request ID và mô tả luồng gọi API để họ kiểm tra.

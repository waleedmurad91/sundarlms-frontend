// import { useState, useEffect } from "react";
// import { Text, Save, Loader2 } from "lucide-react";
// import toast from "react-hot-toast";
// import { CKEditor } from "@ckeditor/ckeditor5-react";
// import ClassicEditor from "@ckeditor/ckeditor5-build-classic";
// import axiosInstance from "@/api/axiosInstance";
// import { buildBackendFileUrl } from "@/utils/buildBackendFileUrl";

// // ---------------------------------------------------------------------------
// // CKEditor upload adapter
// // ---------------------------------------------------------------------------
// const UPLOAD_PATH = "/upload-image";
// const AUTH_TOKEN_KEY = "token";

// class CKEditorUploadAdapter {
//   constructor(loader) {
//     this.loader = loader;
//   }

//   upload() {
//     return this.loader.file.then(
//       (file) =>
//         new Promise((resolve, reject) => {
//           const formData = new FormData();
//           formData.append("upload", file);

//           const token = localStorage.getItem(AUTH_TOKEN_KEY);

//           axiosInstance
//             .post(UPLOAD_PATH, formData, {
//               headers: {
//                 ...(token ? { Authorization: `Bearer ${token}` } : {}),
//               },
//             })
//             .then((response) => {
//               const data = response.data;
//               const rawUrl = data?.url ?? data?.data?.url ?? data?.path;
//               if (!rawUrl) {
//                 throw new Error(
//                   "Upload succeeded but response did not contain a 'url' field.",
//                 );
//               }
//               const url = buildBackendFileUrl(rawUrl);
//               resolve({ default: url });
//             })
//             .catch((err) => {
//               const message =
//                 err?.response?.data?.message ||
//                 err?.response?.data?.error?.message ||
//                 err?.message ||
//                 "Upload failed. Please try again.";
//               reject(message);
//             });
//         }),
//     );
//   }

//   abort() {}
// }

// function CKEditorUploadAdapterPlugin(editor) {
//   editor.plugins.get("FileRepository").createUploadAdapter = (loader) => {
//     return new CKEditorUploadAdapter(loader);
//   };
// }

// const FULL_TOOLBAR = [
//   "heading",
//   "|",
//   "bold",
//   "italic",
//   "link",
//   "bulletedList",
//   "numberedList",
//   "|",
//   "outdent",
//   "indent",
//   "|",
//   "imageUpload",
//   "blockQuote",
//   "insertTable",
//   "mediaEmbed",
//   "undo",
//   "redo",
// ];

// const NO_MEDIA_TOOLBAR = FULL_TOOLBAR.filter(
//   (item) => item !== "imageUpload" && item !== "mediaEmbed",
// );

// const mediaEditorConfig = {
//   toolbar: FULL_TOOLBAR,
//   extraPlugins: [CKEditorUploadAdapterPlugin],
//   mediaEmbed: { previewsInData: true },
// };

// // ---------------------------------------------------------------------------

// export default function TitleDescriptionForm({
//   pageKey,
//   onSuccess,
//   onError,
//   formTitle,
//   showTranslations = false,
//   enableMedia = false,
//   showPublishToggle = false,
// }) {
//   const [title, setTitle] = useState("");
//   const [description, setDescription] = useState("");
//   const [titleUrdu, setTitleUrdu] = useState("");
//   const [titleSindhi, setTitleSindhi] = useState("");
//   const [descriptionUrdu, setDescriptionUrdu] = useState("");
//   const [descriptionSindhi, setDescriptionSindhi] = useState("");
//   const [editorKey, setEditorKey] = useState(0);

//   const [fetching, setFetching] = useState(true);
//   const [loading, setLoading] = useState(false);
//   const [fieldErrors, setFieldErrors] = useState({});

//   const [savedTitle, setSavedTitle] = useState("");
//   const [savedDescription, setSavedDescription] = useState("");
//   const [savedTitleUrdu, setSavedTitleUrdu] = useState("");
//   const [savedTitleSindhi, setSavedTitleSindhi] = useState("");
//   const [savedDescriptionUrdu, setSavedDescriptionUrdu] = useState("");
//   const [savedDescriptionSindhi, setSavedDescriptionSindhi] = useState("");

//   const isDirty =
//     title !== savedTitle ||
//     description !== savedDescription ||
//     titleUrdu !== savedTitleUrdu ||
//     titleSindhi !== savedTitleSindhi ||
//     descriptionUrdu !== savedDescriptionUrdu ||
//     descriptionSindhi !== savedDescriptionSindhi;

//   useEffect(() => {
//     if (!pageKey) return;

//     setFetching(true);

//     axiosInstance
//       .get(`/admin/page-content/${pageKey}`)
//       .then(({ data: res }) => {
//         const t = res.data?.title ?? "";
//         const d = res.data?.description ?? "";
//         const tu = res.data?.title_urdu ?? "";
//         const ts = res.data?.title_sindhi ?? "";
//         const du = res.data?.description_urdu ?? "";
//         const ds = res.data?.description_sindhi ?? "";

//         setTitle(t);
//         setDescription(d);
//         setTitleUrdu(tu);
//         setTitleSindhi(ts);
//         setDescriptionUrdu(du);
//         setDescriptionSindhi(ds);

//         setSavedTitle(t);
//         setSavedDescription(d);
//         setSavedTitleUrdu(tu);
//         setSavedTitleSindhi(ts);
//         setSavedDescriptionUrdu(du);
//         setSavedDescriptionSindhi(ds);

//         setEditorKey((k) => k + 1);
//       })
//       .catch((err) => {
//         if (err?.response?.status !== 404) {
//           toast.error(
//             err?.response?.data?.message ?? "Failed to load page content.",
//           );
//         }
//       })
//       .finally(() => setFetching(false));
//   }, [pageKey]);

//   const handleChange = (e) => {
//     const { name, value } = e.target;
//     if (name === "title") {
//       setTitle(value);
//       if (fieldErrors.title)
//         setFieldErrors((p) => ({ ...p, title: undefined }));
//     } else if (name === "title_urdu") {
//       setTitleUrdu(value);
//       if (fieldErrors.title_urdu)
//         setFieldErrors((p) => ({ ...p, title_urdu: undefined }));
//     } else if (name === "title_sindhi") {
//       setTitleSindhi(value);
//       if (fieldErrors.title_sindhi)
//         setFieldErrors((p) => ({ ...p, title_sindhi: undefined }));
//     }
//   };

//   const clearFieldError = (name) =>
//     setFieldErrors((p) => ({ ...p, [name]: undefined }));

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     if (!isDirty || loading) return;

//     setLoading(true);
//     setFieldErrors({});

//     try {
//       const payload = { title, description };
//       if (showTranslations) {
//         payload.title_urdu = titleUrdu;
//         payload.title_sindhi = titleSindhi;
//         payload.description_urdu = descriptionUrdu;
//         payload.description_sindhi = descriptionSindhi;
//       }

//       const { data: res } = await axiosInstance.patch(
//         `/admin/page-content/${pageKey}`,
//         payload,
//       );

//       const t = res.data?.title ?? title;
//       const d = res.data?.description ?? description;
//       const tu = res.data?.title_urdu ?? titleUrdu;
//       const ts = res.data?.title_sindhi ?? titleSindhi;
//       const du = res.data?.description_urdu ?? descriptionUrdu;
//       const ds = res.data?.description_sindhi ?? descriptionSindhi;

//       setSavedTitle(t);
//       setSavedDescription(d);
//       setSavedTitleUrdu(tu);
//       setSavedTitleSindhi(ts);
//       setSavedDescriptionUrdu(du);
//       setSavedDescriptionSindhi(ds);

//       toast.success(res.message ?? "Page content updated successfully.");
//       onSuccess?.(res.data);
//     } catch (err) {
//       const res = err?.response?.data;
//       if (res?.errors) {
//         setFieldErrors(res.errors);
//         toast.error("Please fix the errors below.");
//       } else {
//         toast.error(res?.message ?? err?.message ?? "Something went wrong.");
//       }
//       onError?.(err);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const fieldError = (name) => fieldErrors?.[name]?.[0] ?? null;

//   const rtlInputStyle = {
//     direction: "rtl",
//     textAlign: "right",
//     fontSize: "1.05rem",
//     lineHeight: "2.2",
//   };

//   const descriptionEditorConfig = enableMedia
//     ? { ...mediaEditorConfig }
//     : { toolbar: NO_MEDIA_TOOLBAR };

//   const urduEditorConfig = {
//     language: { ui: "en", content: "ar" },
//     contentsLangDirection: "rtl",
//     contentsCss: [
//       `body {
//         direction: rtl;
//         text-align: right;
//         font-family: 'Noto Nastaliq Urdu', serif;
//         font-size: 1.1rem;
//         line-height: 2.2;
//       }`,
//     ],
//     ...(enableMedia ? mediaEditorConfig : { toolbar: NO_MEDIA_TOOLBAR }),
//   };

//   const sindhiEditorConfig = {
//     language: { ui: "en", content: "ar" },
//     contentsLangDirection: "rtl",
//     contentsCss: [
//       `body {
//         direction: rtl;
//         text-align: right;
//         font-family: 'MB Lateef', serif;
//         font-size: 1.1rem;
//         line-height: 2.2;
//       }`,
//     ],
//     ...(enableMedia ? mediaEditorConfig : { toolbar: NO_MEDIA_TOOLBAR }),
//   };

//   return (
//     <form onSubmit={handleSubmit}>
//       {fetching ? (
//         <div className="flex h-40 items-center justify-center">
//           <Loader2 className="h-6 w-6 animate-spin text-gray-600" />
//         </div>
//       ) : (
//         <>
//           <div className="form-admin !p-0">
//             {/* ── Title (English) ─────────────────────────────────────── */}
//             <div className="form-group w-full">
//               <label>
//                 <Text size={16} /> {formTitle} Title <span>*</span>
//               </label>
//               <input
//                 type="text"
//                 className={`form-input${fieldError("title") ? " border-red-400" : ""}`}
//                 name="title"
//                 placeholder="Title"
//                 value={title}
//                 onChange={handleChange}
//                 maxLength={255}
//                 disabled={loading}
//               />
//               {fieldError("title") && (
//                 <p className="mt-1 text-xs text-red-600">
//                   {fieldError("title")}
//                 </p>
//               )}
//             </div>

//             {/* ── Title Urdu ───────────────────────────────────────────── */}
//             {showTranslations && (
//               <div className="form-group w-full">
//                 <label className="mb-3 flex items-center">
//                   <Text size={16} />
//                   {formTitle} Title&nbsp;
//                   <span className="font-nastaleeq !text-sm">(اردو)</span>
//                 </label>
//                 <input
//                   type="text"
//                   className={`form-input font-nastaleeq${fieldError("title_urdu") ? " border-red-400" : ""}`}
//                   name="title_urdu"
//                   placeholder="عنوان"
//                   value={titleUrdu}
//                   onChange={handleChange}
//                   maxLength={255}
//                   disabled={loading}
//                   style={rtlInputStyle}
//                 />
//                 {fieldError("title_urdu") && (
//                   <p className="mt-1 text-xs text-red-600">
//                     {fieldError("title_urdu")}
//                   </p>
//                 )}
//               </div>
//             )}

//             {/* ── Title Sindhi ─────────────────────────────────────────── */}
//             {showTranslations && (
//               <div className="form-group w-full">
//                 <label className="mb-3 flex items-center">
//                   <Text size={16} />
//                   {formTitle} Title&nbsp;
//                   <span className="font-lateefi !text-sm">(سنڌي)</span>
//                 </label>
//                 <input
//                   type="text"
//                   className={`form-input font-lateefi${fieldError("title_sindhi") ? " border-red-400" : ""}`}
//                   name="title_sindhi"
//                   placeholder="عنوان"
//                   value={titleSindhi}
//                   onChange={handleChange}
//                   maxLength={255}
//                   disabled={loading}
//                   style={rtlInputStyle}
//                 />
//                 {fieldError("title_sindhi") && (
//                   <p className="mt-1 text-xs text-red-600">
//                     {fieldError("title_sindhi")}
//                   </p>
//                 )}
//               </div>
//             )}

//             {/* ── Description (English) ───────────────────────────────── */}
//             <div className="form-group w-full">
//               <label>
//                 <Text size={16} /> {formTitle} Description
//               </label>
//               <CKEditor
//                 key={editorKey}
//                 editor={ClassicEditor}
//                 data={description}
//                 config={descriptionEditorConfig}
//                 onChange={(_, editor) => {
//                   setDescription(editor.getData());
//                   clearFieldError("description");
//                 }}
//               />
//               {fieldError("description") && (
//                 <p className="mt-1 text-xs text-red-600">
//                   {fieldError("description")}
//                 </p>
//               )}
//             </div>

//             {/* ── Description Urdu ────────────────────────────────────── */}
//             {showTranslations && (
//               <div className="form-group w-full">
//                 <label className="mb-3 flex items-start">
//                   <Text size={16} />
//                   {formTitle} Description&nbsp;
//                   <span className="font-nastaleeq !text-sm">(اردو)</span>
//                 </label>
//                 <CKEditor
//                   key={`urdu-${editorKey}`}
//                   editor={ClassicEditor}
//                   data={descriptionUrdu}
//                   config={urduEditorConfig}
//                   onChange={(_, editor) => {
//                     setDescriptionUrdu(editor.getData());
//                     clearFieldError("description_urdu");
//                   }}
//                 />
//                 {fieldError("description_urdu") && (
//                   <p className="mt-1 text-xs text-red-600">
//                     {fieldError("description_urdu")}
//                   </p>
//                 )}
//               </div>
//             )}

//             {/* ── Description Sindhi ──────────────────────────────────── */}
//             {showTranslations && (
//               <div className="form-group w-full">
//                 <label className="mb-3 flex items-center">
//                   <Text size={16} />
//                   {formTitle} Description&nbsp;
//                   <span className="font-lateefi !text-sm">(سنڌي)</span>
//                 </label>
//                 <CKEditor
//                   key={`sindhi-${editorKey}`}
//                   editor={ClassicEditor}
//                   data={descriptionSindhi}
//                   config={sindhiEditorConfig}
//                   onChange={(_, editor) => {
//                     setDescriptionSindhi(editor.getData());
//                     clearFieldError("description_sindhi");
//                   }}
//                 />
//                 {fieldError("description_sindhi") && (
//                   <p className="mt-1 text-xs text-red-600">
//                     {fieldError("description_sindhi")}
//                   </p>
//                 )}
//               </div>
//             )}
//           </div>

//           {/* ── Buttons ───────────────────────────────────────────────── */}
//           <div className="form-button-row !border-t-0 !pl-0 !mt-0">
//             <button
//               type="submit"
//               className="global-btn flex items-center justify-center gap-1"
//               disabled={loading || !isDirty}
//             >
//               {loading ? (
//                 <>
//                   Please wait
//                   <Loader2 className="mr-2 h-4 w-4 animate-spin" />
//                 </>
//               ) : (
//                 <>
//                   Save Changes
//                   <Save size={18} />
//                 </>
//               )}
//             </button>
//           </div>
//         </>
//       )}
//     </form>
//   );
// }





// import { useState, useEffect } from "react";
// import { Text, Save, Loader2 } from "lucide-react";
// import toast from "react-hot-toast";
// import { CKEditor } from "@ckeditor/ckeditor5-react";
// import ClassicEditor from "@ckeditor/ckeditor5-build-classic";
// import axiosInstance from "@/api/axiosInstance";
// import { buildBackendFileUrl } from "@/utils/buildBackendFileUrl";

// // ---------------------------------------------------------------------------
// // CKEditor upload adapter
// // ---------------------------------------------------------------------------
// const UPLOAD_PATH = "/upload-image";
// const AUTH_TOKEN_KEY = "token";

// class CKEditorUploadAdapter {
//   constructor(loader) {
//     this.loader = loader;
//   }

//   upload() {
//     return this.loader.file.then(
//       (file) =>
//         new Promise((resolve, reject) => {
//           const formData = new FormData();
//           formData.append("upload", file);

//           const token = localStorage.getItem(AUTH_TOKEN_KEY);

//           axiosInstance
//             .post(UPLOAD_PATH, formData, {
//               headers: {
//                 ...(token ? { Authorization: `Bearer ${token}` } : {}),
//               },
//             })
//             .then((response) => {
//               const data = response.data;
//               const rawUrl = data?.url ?? data?.data?.url ?? data?.path;
//               if (!rawUrl) {
//                 throw new Error(
//                   "Upload succeeded but response did not contain a 'url' field.",
//                 );
//               }
//               const url = buildBackendFileUrl(rawUrl);
//               resolve({ default: url });
//             })
//             .catch((err) => {
//               const message =
//                 err?.response?.data?.message ||
//                 err?.response?.data?.error?.message ||
//                 err?.message ||
//                 "Upload failed. Please try again.";
//               reject(message);
//             });
//         }),
//     );
//   }

//   abort() {}
// }

// function CKEditorUploadAdapterPlugin(editor) {
//   editor.plugins.get("FileRepository").createUploadAdapter = (loader) => {
//     return new CKEditorUploadAdapter(loader);
//   };
// }

// const FULL_TOOLBAR = [
//   "heading",
//   "|",
//   "bold",
//   "italic",
//   "link",
//   "bulletedList",
//   "numberedList",
//   "|",
//   "outdent",
//   "indent",
//   "|",
//   "imageUpload",
//   "blockQuote",
//   "insertTable",
//   "mediaEmbed",
//   "undo",
//   "redo",
// ];

// const NO_MEDIA_TOOLBAR = FULL_TOOLBAR.filter(
//   (item) => item !== "imageUpload" && item !== "mediaEmbed",
// );

// const mediaEditorConfig = {
//   toolbar: FULL_TOOLBAR,
//   extraPlugins: [CKEditorUploadAdapterPlugin],
//   mediaEmbed: { previewsInData: true },
// };

// // ---------------------------------------------------------------------------

// export default function TitleDescriptionForm({
//   pageKey,
//   onSuccess,
//   onError,
//   formTitle,
//   showTranslations = false,
//   enableMedia = false,
//   showPublishToggle = false,
// }) {
//   const [title, setTitle] = useState("");
//   const [description, setDescription] = useState("");
//   const [titleUrdu, setTitleUrdu] = useState("");
//   const [titleSindhi, setTitleSindhi] = useState("");
//   const [descriptionUrdu, setDescriptionUrdu] = useState("");
//   const [descriptionSindhi, setDescriptionSindhi] = useState("");
//   const [editorKey, setEditorKey] = useState(0);

//   const [fetching, setFetching] = useState(true);
//   const [loading, setLoading] = useState(false);
//   const [fieldErrors, setFieldErrors] = useState({});

//   const [savedTitle, setSavedTitle] = useState("");
//   const [savedDescription, setSavedDescription] = useState("");
//   const [savedTitleUrdu, setSavedTitleUrdu] = useState("");
//   const [savedTitleSindhi, setSavedTitleSindhi] = useState("");
//   const [savedDescriptionUrdu, setSavedDescriptionUrdu] = useState("");
//   const [savedDescriptionSindhi, setSavedDescriptionSindhi] = useState("");

//   const [published, setPublished] = useState(false);
//   const [savedPublished, setSavedPublished] = useState(false);

//   const isDirty =
//     title !== savedTitle ||
//     description !== savedDescription ||
//     titleUrdu !== savedTitleUrdu ||
//     titleSindhi !== savedTitleSindhi ||
//     descriptionUrdu !== savedDescriptionUrdu ||
//     descriptionSindhi !== savedDescriptionSindhi ||
//     (showPublishToggle && published !== savedPublished); // 👈 tabhi count jab prop true ho

//   useEffect(() => {
//     if (!pageKey) return;

//     setFetching(true);

//     axiosInstance
//       .get(`/admin/page-content/${pageKey}`)
//       .then(({ data: res }) => {
//         const t = res.data?.title ?? "";
//         const d = res.data?.description ?? "";
//         const tu = res.data?.title_urdu ?? "";
//         const ts = res.data?.title_sindhi ?? "";
//         const du = res.data?.description_urdu ?? "";
//         const ds = res.data?.description_sindhi ?? "";
//         const p = Boolean(res.data?.published ?? false);

//         setTitle(t);
//         setDescription(d);
//         setTitleUrdu(tu);
//         setTitleSindhi(ts);
//         setDescriptionUrdu(du);
//         setDescriptionSindhi(ds);
//         setPublished(p);

//         setSavedTitle(t);
//         setSavedDescription(d);
//         setSavedTitleUrdu(tu);
//         setSavedTitleSindhi(ts);
//         setSavedDescriptionUrdu(du);
//         setSavedDescriptionSindhi(ds);
//         setSavedPublished(p);

//         setEditorKey((k) => k + 1);
//       })
//       .catch((err) => {
//         if (err?.response?.status !== 404) {
//           toast.error(
//             err?.response?.data?.message ?? "Failed to load page content.",
//           );
//         }
//       })
//       .finally(() => setFetching(false));
//   }, [pageKey]);

//   const handleChange = (e) => {
//     const { name, value } = e.target;
//     if (name === "title") {
//       setTitle(value);
//       if (fieldErrors.title)
//         setFieldErrors((p) => ({ ...p, title: undefined }));
//     } else if (name === "title_urdu") {
//       setTitleUrdu(value);
//       if (fieldErrors.title_urdu)
//         setFieldErrors((p) => ({ ...p, title_urdu: undefined }));
//     } else if (name === "title_sindhi") {
//       setTitleSindhi(value);
//       if (fieldErrors.title_sindhi)
//         setFieldErrors((p) => ({ ...p, title_sindhi: undefined }));
//     }
//   };

//   const clearFieldError = (name) =>
//     setFieldErrors((p) => ({ ...p, [name]: undefined }));

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     if (!isDirty || loading) return;

//     setLoading(true);
//     setFieldErrors({});

//     try {
//       const payload = { title, description };
//       if (showTranslations) {
//         payload.title_urdu = titleUrdu;
//         payload.title_sindhi = titleSindhi;
//         payload.description_urdu = descriptionUrdu;
//         payload.description_sindhi = descriptionSindhi;
//       }
//       if (showPublishToggle) {
//         payload.published = published;
//       }

//       const { data: res } = await axiosInstance.patch(
//         `/admin/page-content/${pageKey}`,
//         payload,
//       );

//       const t = res.data?.title ?? title;
//       const d = res.data?.description ?? description;
//       const tu = res.data?.title_urdu ?? titleUrdu;
//       const ts = res.data?.title_sindhi ?? titleSindhi;
//       const du = res.data?.description_urdu ?? descriptionUrdu;
//       const ds = res.data?.description_sindhi ?? descriptionSindhi;
//       const p = Boolean(res.data?.published ?? published);

//       setSavedTitle(t);
//       setSavedDescription(d);
//       setSavedTitleUrdu(tu);
//       setSavedTitleSindhi(ts);
//       setSavedDescriptionUrdu(du);
//       setSavedDescriptionSindhi(ds);
//       setSavedPublished(p);
//       setPublished(p);

//       toast.success(res.message ?? "Page content updated successfully.");
//       onSuccess?.(res.data);
//     } catch (err) {
//       const res = err?.response?.data;
//       if (res?.errors) {
//         setFieldErrors(res.errors);
//         toast.error("Please fix the errors below.");
//       } else {
//         toast.error(res?.message ?? err?.message ?? "Something went wrong.");
//       }
//       onError?.(err);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const fieldError = (name) => fieldErrors?.[name]?.[0] ?? null;

//   const rtlInputStyle = {
//     direction: "rtl",
//     textAlign: "right",
//     fontSize: "1.05rem",
//     lineHeight: "2.2",
//   };

//   const descriptionEditorConfig = enableMedia
//     ? { ...mediaEditorConfig }
//     : { toolbar: NO_MEDIA_TOOLBAR };

//   const urduEditorConfig = {
//     language: { ui: "en", content: "ar" },
//     contentsLangDirection: "rtl",
//     contentsCss: [
//       `body {
//         direction: rtl;
//         text-align: right;
//         font-family: 'Noto Nastaliq Urdu', serif;
//         font-size: 1.1rem;
//         line-height: 2.2;
//       }`,
//     ],
//     ...(enableMedia ? mediaEditorConfig : { toolbar: NO_MEDIA_TOOLBAR }),
//   };

//   const sindhiEditorConfig = {
//     language: { ui: "en", content: "ar" },
//     contentsLangDirection: "rtl",
//     contentsCss: [
//       `body {
//         direction: rtl;
//         text-align: right;
//         font-family: 'MB Lateef', serif;
//         font-size: 1.1rem;
//         line-height: 2.2;
//       }`,
//     ],
//     ...(enableMedia ? mediaEditorConfig : { toolbar: NO_MEDIA_TOOLBAR }),
//   };

//   return (
//     <form onSubmit={handleSubmit}>
//       {fetching ? (
//         <div className="flex h-40 items-center justify-center">
//           <Loader2 className="h-6 w-6 animate-spin text-gray-600" />
//         </div>
//       ) : (
//         <>
//           <div className="form-admin !p-0">
//             {/* ── Publish Toggle ───────────────────────────────────────── */}
//             {showPublishToggle && (
//               <div className="form-group w-full">
//                 <label className="flex items-center gap-2 cursor-pointer w-fit">
//                   <input
//                     type="checkbox"
//                     checked={published}
//                     onChange={(e) => setPublished(e.target.checked)}
//                     disabled={loading}
//                   />
//                   <span>
//                     {published
//                       ? "Published (visible on site)"
//                       : "Draft (hidden from site)"}
//                   </span>
//                 </label>
//               </div>
//             )}

//             {/* ── Title (English) ─────────────────────────────────────── */}
//             <div className="form-group w-full">
//               <label>
//                 <Text size={16} /> {formTitle} Title <span>*</span>
//               </label>
//               <input
//                 type="text"
//                 className={`form-input${fieldError("title") ? " border-red-400" : ""}`}
//                 name="title"
//                 placeholder="Title"
//                 value={title}
//                 onChange={handleChange}
//                 maxLength={255}
//                 disabled={loading}
//               />
//               {fieldError("title") && (
//                 <p className="mt-1 text-xs text-red-600">
//                   {fieldError("title")}
//                 </p>
//               )}
//             </div>

//             {/* ── Title Urdu ───────────────────────────────────────────── */}
//             {showTranslations && (
//               <div className="form-group w-full">
//                 <label className="mb-3 flex items-center">
//                   <Text size={16} />
//                   {formTitle} Title&nbsp;
//                   <span className="font-nastaleeq !text-sm">(اردو)</span>
//                 </label>
//                 <input
//                   type="text"
//                   className={`form-input font-nastaleeq${fieldError("title_urdu") ? " border-red-400" : ""}`}
//                   name="title_urdu"
//                   placeholder="عنوان"
//                   value={titleUrdu}
//                   onChange={handleChange}
//                   maxLength={255}
//                   disabled={loading}
//                   style={rtlInputStyle}
//                 />
//                 {fieldError("title_urdu") && (
//                   <p className="mt-1 text-xs text-red-600">
//                     {fieldError("title_urdu")}
//                   </p>
//                 )}
//               </div>
//             )}

//             {/* ── Title Sindhi ─────────────────────────────────────────── */}
//             {showTranslations && (
//               <div className="form-group w-full">
//                 <label className="mb-3 flex items-center">
//                   <Text size={16} />
//                   {formTitle} Title&nbsp;
//                   <span className="font-lateefi !text-sm">(سنڌي)</span>
//                 </label>
//                 <input
//                   type="text"
//                   className={`form-input font-lateefi${fieldError("title_sindhi") ? " border-red-400" : ""}`}
//                   name="title_sindhi"
//                   placeholder="عنوان"
//                   value={titleSindhi}
//                   onChange={handleChange}
//                   maxLength={255}
//                   disabled={loading}
//                   style={rtlInputStyle}
//                 />
//                 {fieldError("title_sindhi") && (
//                   <p className="mt-1 text-xs text-red-600">
//                     {fieldError("title_sindhi")}
//                   </p>
//                 )}
//               </div>
//             )}

//             {/* ── Description (English) ───────────────────────────────── */}
//             <div className="form-group w-full">
//               <label>
//                 <Text size={16} /> {formTitle} Description
//               </label>
//               <CKEditor
//                 key={editorKey}
//                 editor={ClassicEditor}
//                 data={description}
//                 config={descriptionEditorConfig}
//                 onChange={(_, editor) => {
//                   setDescription(editor.getData());
//                   clearFieldError("description");
//                 }}
//               />
//               {fieldError("description") && (
//                 <p className="mt-1 text-xs text-red-600">
//                   {fieldError("description")}
//                 </p>
//               )}
//             </div>

//             {/* ── Description Urdu ────────────────────────────────────── */}
//             {showTranslations && (
//               <div className="form-group w-full">
//                 <label className="mb-3 flex items-start">
//                   <Text size={16} />
//                   {formTitle} Description&nbsp;
//                   <span className="font-nastaleeq !text-sm">(اردو)</span>
//                 </label>
//                 <CKEditor
//                   key={`urdu-${editorKey}`}
//                   editor={ClassicEditor}
//                   data={descriptionUrdu}
//                   config={urduEditorConfig}
//                   onChange={(_, editor) => {
//                     setDescriptionUrdu(editor.getData());
//                     clearFieldError("description_urdu");
//                   }}
//                 />
//                 {fieldError("description_urdu") && (
//                   <p className="mt-1 text-xs text-red-600">
//                     {fieldError("description_urdu")}
//                   </p>
//                 )}
//               </div>
//             )}

//             {/* ── Description Sindhi ──────────────────────────────────── */}
//             {showTranslations && (
//               <div className="form-group w-full">
//                 <label className="mb-3 flex items-center">
//                   <Text size={16} />
//                   {formTitle} Description&nbsp;
//                   <span className="font-lateefi !text-sm">(سنڌي)</span>
//                 </label>
//                 <CKEditor
//                   key={`sindhi-${editorKey}`}
//                   editor={ClassicEditor}
//                   data={descriptionSindhi}
//                   config={sindhiEditorConfig}
//                   onChange={(_, editor) => {
//                     setDescriptionSindhi(editor.getData());
//                     clearFieldError("description_sindhi");
//                   }}
//                 />
//                 {fieldError("description_sindhi") && (
//                   <p className="mt-1 text-xs text-red-600">
//                     {fieldError("description_sindhi")}
//                   </p>
//                 )}
//               </div>
//             )}
//           </div>

//           {/* ── Buttons ───────────────────────────────────────────────── */}
//           <div className="form-button-row !border-t-0 !pl-0 !mt-0">
//             <button
//               type="submit"
//               className="global-btn flex items-center justify-center gap-1"
//               disabled={loading || !isDirty}
//             >
//               {loading ? (
//                 <>
//                   Please wait
//                   <Loader2 className="mr-2 h-4 w-4 animate-spin" />
//                 </>
//               ) : (
//                 <>
//                   Save Changes
//                   <Save size={18} />
//                 </>
//               )}
//             </button>
//           </div>
//         </>
//       )}
//     </form>
//   );
// }




// import { useState, useEffect } from "react";
// import { Text, Save, Loader2 } from "lucide-react";
// import toast from "react-hot-toast";
// import { CKEditor } from "@ckeditor/ckeditor5-react";
// import ClassicEditor from "@ckeditor/ckeditor5-build-classic";
// import axiosInstance from "@/api/axiosInstance";
// import { buildBackendFileUrl } from "@/utils/buildBackendFileUrl";

// // ---------------------------------------------------------------------------
// // CKEditor upload adapter
// // ---------------------------------------------------------------------------
// const UPLOAD_PATH = "/upload-image";
// const AUTH_TOKEN_KEY = "token";

// class CKEditorUploadAdapter {
//   constructor(loader) {
//     this.loader = loader;
//   }

//   upload() {
//     return this.loader.file.then(
//       (file) =>
//         new Promise((resolve, reject) => {
//           const formData = new FormData();
//           formData.append("upload", file);

//           const token = localStorage.getItem(AUTH_TOKEN_KEY);

//           axiosInstance
//             .post(UPLOAD_PATH, formData, {
//               headers: {
//                 ...(token ? { Authorization: `Bearer ${token}` } : {}),
//               },
//             })
//             .then((response) => {
//               const data = response.data;
//               const rawUrl = data?.url ?? data?.data?.url ?? data?.path;
//               if (!rawUrl) {
//                 throw new Error(
//                   "Upload succeeded but response did not contain a 'url' field.",
//                 );
//               }
//               const url = buildBackendFileUrl(rawUrl);
//               resolve({ default: url });
//             })
//             .catch((err) => {
//               const message =
//                 err?.response?.data?.message ||
//                 err?.response?.data?.error?.message ||
//                 err?.message ||
//                 "Upload failed. Please try again.";
//               reject(message);
//             });
//         }),
//     );
//   }

//   abort() {}
// }

// function CKEditorUploadAdapterPlugin(editor) {
//   editor.plugins.get("FileRepository").createUploadAdapter = (loader) => {
//     return new CKEditorUploadAdapter(loader);
//   };
// }

// const FULL_TOOLBAR = [
//   "heading",
//   "|",
//   "bold",
//   "italic",
//   "link",
//   "bulletedList",
//   "numberedList",
//   "|",
//   "outdent",
//   "indent",
//   "|",
//   "imageUpload",
//   "blockQuote",
//   "insertTable",
//   "mediaEmbed",
//   "undo",
//   "redo",
// ];

// const NO_MEDIA_TOOLBAR = FULL_TOOLBAR.filter(
//   (item) => item !== "imageUpload" && item !== "mediaEmbed",
// );

// const mediaEditorConfig = {
//   toolbar: FULL_TOOLBAR,
//   extraPlugins: [CKEditorUploadAdapterPlugin],
//   mediaEmbed: { previewsInData: true },
// };

// // ---------------------------------------------------------------------------

// export default function TitleDescriptionForm({
//   pageKey,
//   onSuccess,
//   onError,
//   formTitle,
//   showTranslations = false,
//   enableMedia = false,
//   showPublishToggle = false,
// }) {
//   const [title, setTitle] = useState("");
//   const [description, setDescription] = useState("");
//   const [titleUrdu, setTitleUrdu] = useState("");
//   const [titleSindhi, setTitleSindhi] = useState("");
//   const [descriptionUrdu, setDescriptionUrdu] = useState("");
//   const [descriptionSindhi, setDescriptionSindhi] = useState("");
//   const [editorKey, setEditorKey] = useState(0);

//   const [fetching, setFetching] = useState(true);
//   const [loading, setLoading] = useState(false);
//   const [fieldErrors, setFieldErrors] = useState({});

//   const [savedTitle, setSavedTitle] = useState("");
//   const [savedDescription, setSavedDescription] = useState("");
//   const [savedTitleUrdu, setSavedTitleUrdu] = useState("");
//   const [savedTitleSindhi, setSavedTitleSindhi] = useState("");
//   const [savedDescriptionUrdu, setSavedDescriptionUrdu] = useState("");
//   const [savedDescriptionSindhi, setSavedDescriptionSindhi] = useState("");

//   // 0 = unpublished, 1 = published
//   const [status, setStatus] = useState(0);
//   const [savedStatus, setSavedStatus] = useState(0);

//   const isDirty =
//     title !== savedTitle ||
//     description !== savedDescription ||
//     titleUrdu !== savedTitleUrdu ||
//     titleSindhi !== savedTitleSindhi ||
//     descriptionUrdu !== savedDescriptionUrdu ||
//     descriptionSindhi !== savedDescriptionSindhi ||
//     (showPublishToggle && status !== savedStatus);

//   useEffect(() => {
//     if (!pageKey) return;

//     setFetching(true);

//     axiosInstance
//       .get(`/admin/page-content/${pageKey}`)
//       .then(({ data: res }) => {
//         const t = res.data?.title ?? "";
//         const d = res.data?.description ?? "";
//         const tu = res.data?.title_urdu ?? "";
//         const ts = res.data?.title_sindhi ?? "";
//         const du = res.data?.description_urdu ?? "";
//         const ds = res.data?.description_sindhi ?? "";
//         const s = Number(res.data?.status ?? 0);

//         setTitle(t);
//         setDescription(d);
//         setTitleUrdu(tu);
//         setTitleSindhi(ts);
//         setDescriptionUrdu(du);
//         setDescriptionSindhi(ds);
//         setStatus(s);

//         setSavedTitle(t);
//         setSavedDescription(d);
//         setSavedTitleUrdu(tu);
//         setSavedTitleSindhi(ts);
//         setSavedDescriptionUrdu(du);
//         setSavedDescriptionSindhi(ds);
//         setSavedStatus(s);

//         setEditorKey((k) => k + 1);
//       })
//       .catch((err) => {
//         if (err?.response?.status !== 404) {
//           toast.error(
//             err?.response?.data?.message ?? "Failed to load page content.",
//           );
//         }
//       })
//       .finally(() => setFetching(false));
//   }, [pageKey]);

//   const handleChange = (e) => {
//     const { name, value } = e.target;
//     if (name === "title") {
//       setTitle(value);
//       if (fieldErrors.title)
//         setFieldErrors((p) => ({ ...p, title: undefined }));
//     } else if (name === "title_urdu") {
//       setTitleUrdu(value);
//       if (fieldErrors.title_urdu)
//         setFieldErrors((p) => ({ ...p, title_urdu: undefined }));
//     } else if (name === "title_sindhi") {
//       setTitleSindhi(value);
//       if (fieldErrors.title_sindhi)
//         setFieldErrors((p) => ({ ...p, title_sindhi: undefined }));
//     }
//   };

//   const clearFieldError = (name) =>
//     setFieldErrors((p) => ({ ...p, [name]: undefined }));

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     if (!isDirty || loading) return;

//     setLoading(true);
//     setFieldErrors({});

//     try {
//       const payload = { title, description };
//       if (showTranslations) {
//         payload.title_urdu = titleUrdu;
//         payload.title_sindhi = titleSindhi;
//         payload.description_urdu = descriptionUrdu;
//         payload.description_sindhi = descriptionSindhi;
//       }
//       if (showPublishToggle) {
//         payload.status = status; // 1 ya 0
//       }

//       const { data: res } = await axiosInstance.patch(
//         `/admin/page-content/${pageKey}`,
//         payload,
//       );

//       const t = res.data?.title ?? title;
//       const d = res.data?.description ?? description;
//       const tu = res.data?.title_urdu ?? titleUrdu;
//       const ts = res.data?.title_sindhi ?? titleSindhi;
//       const du = res.data?.description_urdu ?? descriptionUrdu;
//       const ds = res.data?.description_sindhi ?? descriptionSindhi;
//       const s = Number(res.data?.status ?? status);

//       setSavedTitle(t);
//       setSavedDescription(d);
//       setSavedTitleUrdu(tu);
//       setSavedTitleSindhi(ts);
//       setSavedDescriptionUrdu(du);
//       setSavedDescriptionSindhi(ds);
//       setSavedStatus(s);
//       setStatus(s);

//       toast.success(res.message ?? "Page content updated successfully.");
//       onSuccess?.(res.data);
//     } catch (err) {
//       const res = err?.response?.data;
//       if (res?.errors) {
//         setFieldErrors(res.errors);
//         toast.error("Please fix the errors below.");
//       } else {
//         toast.error(res?.message ?? err?.message ?? "Something went wrong.");
//       }
//       onError?.(err);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const fieldError = (name) => fieldErrors?.[name]?.[0] ?? null;

//   const rtlInputStyle = {
//     direction: "rtl",
//     textAlign: "right",
//     fontSize: "1.05rem",
//     lineHeight: "2.2",
//   };

//   const descriptionEditorConfig = enableMedia
//     ? { ...mediaEditorConfig }
//     : { toolbar: NO_MEDIA_TOOLBAR };

//   const urduEditorConfig = {
//     language: { ui: "en", content: "ar" },
//     contentsLangDirection: "rtl",
//     contentsCss: [
//       `body {
//         direction: rtl;
//         text-align: right;
//         font-family: 'Noto Nastaliq Urdu', serif;
//         font-size: 1.1rem;
//         line-height: 2.2;
//       }`,
//     ],
//     ...(enableMedia ? mediaEditorConfig : { toolbar: NO_MEDIA_TOOLBAR }),
//   };

//   const sindhiEditorConfig = {
//     language: { ui: "en", content: "ar" },
//     contentsLangDirection: "rtl",
//     contentsCss: [
//       `body {
//         direction: rtl;
//         text-align: right;
//         font-family: 'MB Lateef', serif;
//         font-size: 1.1rem;
//         line-height: 2.2;
//       }`,
//     ],
//     ...(enableMedia ? mediaEditorConfig : { toolbar: NO_MEDIA_TOOLBAR }),
//   };

//   return (
//     <form onSubmit={handleSubmit}>
//       {fetching ? (
//         <div className="flex h-40 items-center justify-center">
//           <Loader2 className="h-6 w-6 animate-spin text-gray-600" />
//         </div>
//       ) : (
//         <>
//           <div className="form-admin !p-0">
//             {/* ── Publish Toggle ───────────────────────────────────────── */}
//             {showPublishToggle && (
//               <div className="form-group w-full">
//                 <label className="flex items-center gap-2 cursor-pointer w-fit">
//                   <input
//                     type="checkbox"
//                     checked={status === 1}
//                     onChange={(e) => setStatus(e.target.checked ? 1 : 0)}
//                     disabled={loading}
//                   />
//                   <span>
//                     {status === 1
//                       ? "Published (visible on site)"
//                       : "Draft (hidden from site)"}
//                   </span>
//                 </label>
//               </div>
//             )}

//             {/* ── Title (English) ─────────────────────────────────────── */}
//             <div className="form-group w-full">
//               <label>
//                 <Text size={16} /> {formTitle} Title <span>*</span>
//               </label>
//               <input
//                 type="text"
//                 className={`form-input${fieldError("title") ? " border-red-400" : ""}`}
//                 name="title"
//                 placeholder="Title"
//                 value={title}
//                 onChange={handleChange}
//                 maxLength={255}
//                 disabled={loading}
//               />
//               {fieldError("title") && (
//                 <p className="mt-1 text-xs text-red-600">
//                   {fieldError("title")}
//                 </p>
//               )}
//             </div>

//             {/* ── Title Urdu ───────────────────────────────────────────── */}
//             {showTranslations && (
//               <div className="form-group w-full">
//                 <label className="mb-3 flex items-center">
//                   <Text size={16} />
//                   {formTitle} Title&nbsp;
//                   <span className="font-nastaleeq !text-sm">(اردو)</span>
//                 </label>
//                 <input
//                   type="text"
//                   className={`form-input font-nastaleeq${fieldError("title_urdu") ? " border-red-400" : ""}`}
//                   name="title_urdu"
//                   placeholder="عنوان"
//                   value={titleUrdu}
//                   onChange={handleChange}
//                   maxLength={255}
//                   disabled={loading}
//                   style={rtlInputStyle}
//                 />
//                 {fieldError("title_urdu") && (
//                   <p className="mt-1 text-xs text-red-600">
//                     {fieldError("title_urdu")}
//                   </p>
//                 )}
//               </div>
//             )}

//             {/* ── Title Sindhi ─────────────────────────────────────────── */}
//             {showTranslations && (
//               <div className="form-group w-full">
//                 <label className="mb-3 flex items-center">
//                   <Text size={16} />
//                   {formTitle} Title&nbsp;
//                   <span className="font-lateefi !text-sm">(سنڌي)</span>
//                 </label>
//                 <input
//                   type="text"
//                   className={`form-input font-lateefi${fieldError("title_sindhi") ? " border-red-400" : ""}`}
//                   name="title_sindhi"
//                   placeholder="عنوان"
//                   value={titleSindhi}
//                   onChange={handleChange}
//                   maxLength={255}
//                   disabled={loading}
//                   style={rtlInputStyle}
//                 />
//                 {fieldError("title_sindhi") && (
//                   <p className="mt-1 text-xs text-red-600">
//                     {fieldError("title_sindhi")}
//                   </p>
//                 )}
//               </div>
//             )}

//             {/* ── Description (English) ───────────────────────────────── */}
//             <div className="form-group w-full">
//               <label>
//                 <Text size={16} /> {formTitle} Description
//               </label>
//               <CKEditor
//                 key={editorKey}
//                 editor={ClassicEditor}
//                 data={description}
//                 config={descriptionEditorConfig}
//                 onChange={(_, editor) => {
//                   setDescription(editor.getData());
//                   clearFieldError("description");
//                 }}
//               />
//               {fieldError("description") && (
//                 <p className="mt-1 text-xs text-red-600">
//                   {fieldError("description")}
//                 </p>
//               )}
//             </div>

//             {/* ── Description Urdu ────────────────────────────────────── */}
//             {showTranslations && (
//               <div className="form-group w-full">
//                 <label className="mb-3 flex items-start">
//                   <Text size={16} />
//                   {formTitle} Description&nbsp;
//                   <span className="font-nastaleeq !text-sm">(اردو)</span>
//                 </label>
//                 <CKEditor
//                   key={`urdu-${editorKey}`}
//                   editor={ClassicEditor}
//                   data={descriptionUrdu}
//                   config={urduEditorConfig}
//                   onChange={(_, editor) => {
//                     setDescriptionUrdu(editor.getData());
//                     clearFieldError("description_urdu");
//                   }}
//                 />
//                 {fieldError("description_urdu") && (
//                   <p className="mt-1 text-xs text-red-600">
//                     {fieldError("description_urdu")}
//                   </p>
//                 )}
//               </div>
//             )}

//             {/* ── Description Sindhi ──────────────────────────────────── */}
//             {showTranslations && (
//               <div className="form-group w-full">
//                 <label className="mb-3 flex items-center">
//                   <Text size={16} />
//                   {formTitle} Description&nbsp;
//                   <span className="font-lateefi !text-sm">(سنڌي)</span>
//                 </label>
//                 <CKEditor
//                   key={`sindhi-${editorKey}`}
//                   editor={ClassicEditor}
//                   data={descriptionSindhi}
//                   config={sindhiEditorConfig}
//                   onChange={(_, editor) => {
//                     setDescriptionSindhi(editor.getData());
//                     clearFieldError("description_sindhi");
//                   }}
//                 />
//                 {fieldError("description_sindhi") && (
//                   <p className="mt-1 text-xs text-red-600">
//                     {fieldError("description_sindhi")}
//                   </p>
//                 )}
//               </div>
//             )}
//           </div>

//           {/* ── Buttons ───────────────────────────────────────────────── */}
//           <div className="form-button-row !border-t-0 !pl-0 !mt-0">
//             <button
//               type="submit"
//               className="global-btn flex items-center justify-center gap-1"
//               disabled={loading || !isDirty}
//             >
//               {loading ? (
//                 <>
//                   Please wait
//                   <Loader2 className="mr-2 h-4 w-4 animate-spin" />
//                 </>
//               ) : (
//                 <>
//                   Save Changes
//                   <Save size={18} />
//                 </>
//               )}
//             </button>
//           </div>
//         </>
//       )}
//     </form>
//   );
// }



import { useState, useEffect } from "react";
import { Text, Save, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { CKEditor } from "@ckeditor/ckeditor5-react";
import ClassicEditor from "@ckeditor/ckeditor5-build-classic";
import axiosInstance from "@/api/axiosInstance";
import { buildBackendFileUrl } from "@/utils/BuildBackendFileUrl";

// ---------------------------------------------------------------------------
// CKEditor upload adapter
// ---------------------------------------------------------------------------
const UPLOAD_PATH = "/upload-image";
const AUTH_TOKEN_KEY = "token";

class CKEditorUploadAdapter {
  constructor(loader) {
    this.loader = loader;
  }

  upload() {
    return this.loader.file.then(
      (file) =>
        new Promise((resolve, reject) => {
          const formData = new FormData();
          formData.append("upload", file);

          const token = localStorage.getItem(AUTH_TOKEN_KEY);

          axiosInstance
            .post(UPLOAD_PATH, formData, {
              headers: {
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
              },
            })
            .then((response) => {
              const data = response.data;
              const rawUrl = data?.url ?? data?.data?.url ?? data?.path;
              if (!rawUrl) {
                throw new Error(
                  "Upload succeeded but response did not contain a 'url' field.",
                );
              }
              const url = buildBackendFileUrl(rawUrl);
              resolve({ default: url });
            })
            .catch((err) => {
              const message =
                err?.response?.data?.message ||
                err?.response?.data?.error?.message ||
                err?.message ||
                "Upload failed. Please try again.";
              reject(message);
            });
        }),
    );
  }

  abort() {}
}

function CKEditorUploadAdapterPlugin(editor) {
  editor.plugins.get("FileRepository").createUploadAdapter = (loader) => {
    return new CKEditorUploadAdapter(loader);
  };
}

const FULL_TOOLBAR = [
  "heading",
  "|",
  "bold",
  "italic",
  "link",
  "bulletedList",
  "numberedList",
  "|",
  "outdent",
  "indent",
  "|",
  "imageUpload",
  "blockQuote",
  "insertTable",
  "mediaEmbed",
  "undo",
  "redo",
];

const NO_MEDIA_TOOLBAR = FULL_TOOLBAR.filter(
  (item) => item !== "imageUpload" && item !== "mediaEmbed",
);

const mediaEditorConfig = {
  toolbar: FULL_TOOLBAR,
  extraPlugins: [CKEditorUploadAdapterPlugin],
  mediaEmbed: { previewsInData: true },
};

// ---------------------------------------------------------------------------

export default function TitleDescriptionForm({
  pageKey,
  onSuccess,
  onError,
  formTitle,
  showTranslations = false,
  enableMedia = false,
  showPublishToggle = false,
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [titleUrdu, setTitleUrdu] = useState("");
  const [titleSindhi, setTitleSindhi] = useState("");
  const [descriptionUrdu, setDescriptionUrdu] = useState("");
  const [descriptionSindhi, setDescriptionSindhi] = useState("");
  const [editorKey, setEditorKey] = useState(0);

  const [fetching, setFetching] = useState(true);
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  const [savedTitle, setSavedTitle] = useState("");
  const [savedDescription, setSavedDescription] = useState("");
  const [savedTitleUrdu, setSavedTitleUrdu] = useState("");
  const [savedTitleSindhi, setSavedTitleSindhi] = useState("");
  const [savedDescriptionUrdu, setSavedDescriptionUrdu] = useState("");
  const [savedDescriptionSindhi, setSavedDescriptionSindhi] = useState("");

  // 0 = unpublished, 1 = published
  const [status, setStatus] = useState(0);
  const [savedStatus, setSavedStatus] = useState(0);

  const isDirty =
    title !== savedTitle ||
    description !== savedDescription ||
    titleUrdu !== savedTitleUrdu ||
    titleSindhi !== savedTitleSindhi ||
    descriptionUrdu !== savedDescriptionUrdu ||
    descriptionSindhi !== savedDescriptionSindhi ||
    (showPublishToggle && status !== savedStatus);

  useEffect(() => {
    if (!pageKey) return;

    setFetching(true);

    axiosInstance
      .get(`/admin/page-content/${pageKey}`)
      .then(({ data: res }) => {
        const t = res.data?.title ?? "";
        const d = res.data?.description ?? "";
        const tu = res.data?.title_urdu ?? "";
        const ts = res.data?.title_sindhi ?? "";
        const du = res.data?.description_urdu ?? "";
        const ds = res.data?.description_sindhi ?? "";
        const s = Number(res.data?.status ?? 0);

        setTitle(t);
        setDescription(d);
        setTitleUrdu(tu);
        setTitleSindhi(ts);
        setDescriptionUrdu(du);
        setDescriptionSindhi(ds);
        setStatus(s);

        setSavedTitle(t);
        setSavedDescription(d);
        setSavedTitleUrdu(tu);
        setSavedTitleSindhi(ts);
        setSavedDescriptionUrdu(du);
        setSavedDescriptionSindhi(ds);
        setSavedStatus(s);

        setEditorKey((k) => k + 1);
      })
      .catch((err) => {
        if (err?.response?.status !== 404) {
          toast.error(
            err?.response?.data?.message ?? "Failed to load page content.",
          );
        }
      })
      .finally(() => setFetching(false));
  }, [pageKey]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "title") {
      setTitle(value);
      if (fieldErrors.title)
        setFieldErrors((p) => ({ ...p, title: undefined }));
    } else if (name === "title_urdu") {
      setTitleUrdu(value);
      if (fieldErrors.title_urdu)
        setFieldErrors((p) => ({ ...p, title_urdu: undefined }));
    } else if (name === "title_sindhi") {
      setTitleSindhi(value);
      if (fieldErrors.title_sindhi)
        setFieldErrors((p) => ({ ...p, title_sindhi: undefined }));
    }
  };

  const clearFieldError = (name) =>
    setFieldErrors((p) => ({ ...p, [name]: undefined }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isDirty || loading) return;

    setLoading(true);
    setFieldErrors({});

    try {
      const payload = { title, description };
      if (showTranslations) {
        payload.title_urdu = titleUrdu;
        payload.title_sindhi = titleSindhi;
        payload.description_urdu = descriptionUrdu;
        payload.description_sindhi = descriptionSindhi;
      }
      if (showPublishToggle) {
        payload.status = status; // 1 ya 0
      }

      const { data: res } = await axiosInstance.patch(
        `/admin/page-content/${pageKey}`,
        payload,
      );

      const t = res.data?.title ?? title;
      const d = res.data?.description ?? description;
      const tu = res.data?.title_urdu ?? titleUrdu;
      const ts = res.data?.title_sindhi ?? titleSindhi;
      const du = res.data?.description_urdu ?? descriptionUrdu;
      const ds = res.data?.description_sindhi ?? descriptionSindhi;
      const s = Number(res.data?.status ?? status);

      setSavedTitle(t);
      setSavedDescription(d);
      setSavedTitleUrdu(tu);
      setSavedTitleSindhi(ts);
      setSavedDescriptionUrdu(du);
      setSavedDescriptionSindhi(ds);
      setSavedStatus(s);
      setStatus(s);

      toast.success(res.message ?? "Page content updated successfully.");
      onSuccess?.(res.data);
    } catch (err) {
      const res = err?.response?.data;
      if (res?.errors) {
        setFieldErrors(res.errors);
        toast.error("Please fix the errors below.");
      } else {
        toast.error(res?.message ?? err?.message ?? "Something went wrong.");
      }
      onError?.(err);
    } finally {
      setLoading(false);
    }
  };

  const fieldError = (name) => fieldErrors?.[name]?.[0] ?? null;

  const rtlInputStyle = {
    direction: "rtl",
    textAlign: "right",
    fontSize: "1.05rem",
    lineHeight: "2.2",
  };

  const descriptionEditorConfig = enableMedia
    ? { ...mediaEditorConfig }
    : { toolbar: NO_MEDIA_TOOLBAR };

  const urduEditorConfig = {
    language: { ui: "en", content: "ar" },
    contentsLangDirection: "rtl",
    contentsCss: [
      `body {
        direction: rtl;
        text-align: right;
        font-family: 'Noto Nastaliq Urdu', serif;
        font-size: 1.1rem;
        line-height: 2.2;
      }`,
    ],
    ...(enableMedia ? mediaEditorConfig : { toolbar: NO_MEDIA_TOOLBAR }),
  };

  const sindhiEditorConfig = {
    language: { ui: "en", content: "ar" },
    contentsLangDirection: "rtl",
    contentsCss: [
      `body {
        direction: rtl;
        text-align: right;
        font-family: 'MB Lateef', serif;
        font-size: 1.1rem;
        line-height: 2.2;
      }`,
    ],
    ...(enableMedia ? mediaEditorConfig : { toolbar: NO_MEDIA_TOOLBAR }),
  };

  return (
    <form onSubmit={handleSubmit}>
      {fetching ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-gray-600" />
        </div>
      ) : (
        <>
          <div className="form-admin !p-0">
            {/* ── Title (English) ─────────────────────────────────────── */}
            <div className="form-group w-full">
              <label>
                <Text size={16} /> {formTitle} Title <span>*</span>
              </label>
              <input
                type="text"
                className={`form-input${fieldError("title") ? " border-red-400" : ""}`}
                name="title"
                placeholder="Title"
                value={title}
                onChange={handleChange}
                maxLength={255}
                disabled={loading}
              />
              {fieldError("title") && (
                <p className="mt-1 text-xs text-red-600">
                  {fieldError("title")}
                </p>
              )}
            </div>

            {/* ── Title Urdu ───────────────────────────────────────────── */}
            {showTranslations && (
              <div className="form-group w-full">
                <label className="mb-3 flex items-center">
                  <Text size={16} />
                  {formTitle} Title&nbsp;
                  <span className="font-nastaleeq !text-sm">(اردو)</span>
                </label>
                <input
                  type="text"
                  className={`form-input font-nastaleeq${fieldError("title_urdu") ? " border-red-400" : ""}`}
                  name="title_urdu"
                  placeholder="عنوان"
                  value={titleUrdu}
                  onChange={handleChange}
                  maxLength={255}
                  disabled={loading}
                  style={rtlInputStyle}
                />
                {fieldError("title_urdu") && (
                  <p className="mt-1 text-xs text-red-600">
                    {fieldError("title_urdu")}
                  </p>
                )}
              </div>
            )}

            {/* ── Title Sindhi ─────────────────────────────────────────── */}
            {showTranslations && (
              <div className="form-group w-full">
                <label className="mb-3 flex items-center">
                  <Text size={16} />
                  {formTitle} Title&nbsp;
                  <span className="font-lateefi !text-sm">(سنڌي)</span>
                </label>
                <input
                  type="text"
                  className={`form-input font-lateefi${fieldError("title_sindhi") ? " border-red-400" : ""}`}
                  name="title_sindhi"
                  placeholder="عنوان"
                  value={titleSindhi}
                  onChange={handleChange}
                  maxLength={255}
                  disabled={loading}
                  style={rtlInputStyle}
                />
                {fieldError("title_sindhi") && (
                  <p className="mt-1 text-xs text-red-600">
                    {fieldError("title_sindhi")}
                  </p>
                )}
              </div>
            )}

            {/* ── Description (English) ───────────────────────────────── */}
            <div className="form-group w-full">
              <label>
                <Text size={16} /> {formTitle} Description
              </label>
              <CKEditor
                key={editorKey}
                editor={ClassicEditor}
                data={description}
                config={descriptionEditorConfig}
                onChange={(_, editor) => {
                  setDescription(editor.getData());
                  clearFieldError("description");
                }}
              />
              {fieldError("description") && (
                <p className="mt-1 text-xs text-red-600">
                  {fieldError("description")}
                </p>
              )}
            </div>

            {/* ── Description Urdu ────────────────────────────────────── */}
            {showTranslations && (
              <div className="form-group w-full">
                <label className="mb-3 flex items-start">
                  <Text size={16} />
                  {formTitle} Description&nbsp;
                  <span className="font-nastaleeq !text-sm">(اردو)</span>
                </label>
                <CKEditor
                  key={`urdu-${editorKey}`}
                  editor={ClassicEditor}
                  data={descriptionUrdu}
                  config={urduEditorConfig}
                  onChange={(_, editor) => {
                    setDescriptionUrdu(editor.getData());
                    clearFieldError("description_urdu");
                  }}
                />
                {fieldError("description_urdu") && (
                  <p className="mt-1 text-xs text-red-600">
                    {fieldError("description_urdu")}
                  </p>
                )}
              </div>
            )}

            {/* ── Description Sindhi ──────────────────────────────────── */}
            {showTranslations && (
              <div className="form-group w-full">
                <label className="mb-3 flex items-center">
                  <Text size={16} />
                  {formTitle} Description&nbsp;
                  <span className="font-lateefi !text-sm">(سنڌي)</span>
                </label>
                <CKEditor
                  key={`sindhi-${editorKey}`}
                  editor={ClassicEditor}
                  data={descriptionSindhi}
                  config={sindhiEditorConfig}
                  onChange={(_, editor) => {
                    setDescriptionSindhi(editor.getData());
                    clearFieldError("description_sindhi");
                  }}
                />
                {fieldError("description_sindhi") && (
                  <p className="mt-1 text-xs text-red-600">
                    {fieldError("description_sindhi")}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* ── Buttons ───────────────────────────────────────────────── */}
          <div className="form-button-row !border-t-0 !pl-0 !mt-0 flex items-center gap-4">
            {showPublishToggle && (
              <label className="flex items-center gap-3 cursor-pointer w-fit select-none">
                <span className="relative inline-flex items-center">
                  <input
                    type="checkbox"
                    checked={status === 1}
                    onChange={(e) => setStatus(e.target.checked ? 1 : 0)}
                    disabled={loading}
                    className="sr-only peer"
                  />
                  <span
                    className="w-11 h-6 rounded-full bg-gray-300 peer-checked:bg-[#AD474B]
                               transition-colors duration-300 ease-in-out
                               peer-disabled:opacity-50 peer-disabled:cursor-not-allowed"
                  ></span>
                  <span
                    className="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow
                               transition-transform duration-300 ease-in-out
                               peer-checked:translate-x-5"
                  ></span>
                </span>
                <span
                  className="font-medium"
                  style={{ color: status === 1 ? "#AD474B" : "#6b7280" }}
                >
                  {status === 1
                    ? "Published"
                    : "Draft"}
                </span>
              </label>
            )}

            <button
              type="submit"
              className="global-btn flex items-center justify-center gap-1"
              disabled={loading || !isDirty}
            >
              {loading ? (
                <>
                  Please wait
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                </>
              ) : (
                <>
                  Save Changes
                  <Save size={18} />
                </>
              )}
            </button>
          </div>
        </>
      )}
    </form>
  );
}
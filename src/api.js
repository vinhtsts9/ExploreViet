const API_BASE_URL = "http://localhost:8080";

// Biến cờ để ngăn chặn nhiều yêu cầu làm mới token cùng lúc
let isRefreshing = false;
// Hàng đợi cho các yêu cầu bị lỗi 401 trong khi đang làm mới token
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

const apiRequest = async (endpoint, method, data = null, options = {}) => {
  const fullUrl = `${API_BASE_URL}${endpoint}`;
  const isForm = typeof FormData !== "undefined" && data instanceof FormData;
  const { needsAuth = false, idempotencyKey = null } = options;

  const headers = {};
  const fetchOptions = { method, headers };

  if (idempotencyKey) {
    headers["Idempotency-Key"] = idempotencyKey;
  }

  if (data) {
    if (isForm) {
      fetchOptions.body = data;
    } else {
      headers["Content-Type"] = "application/json";
      fetchOptions.body = JSON.stringify(data);
    }
  }

  // If frontend exposed Firebase token helper, use it for Authorization Bearer.
  if (needsAuth) {
    try {
      if (typeof window.getFirebaseToken === "function") {
        const token = await window.getFirebaseToken();
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        } else {
          // Fallback to cookie-based session if no token
          fetchOptions.credentials = "include";
        }
      } else {
        fetchOptions.credentials = "include";
      }
    } catch (err) {
      fetchOptions.credentials = "include";
    }
  }

  try {
    let response = await fetch(fullUrl, fetchOptions);

    // If using cookie-based session and got 401, attempt refresh flow
    const usingAuthHeader = !!headers["Authorization"];
    if (!usingAuthHeader && needsAuth && response.status === 401) {
      if (!isRefreshing) {
        isRefreshing = true;
        try {
          const refreshResponse = await fetch(
            `${API_BASE_URL}/users/refresh-token`,
            {
              method: "POST",
              credentials: "include",
            }
          );

          if (!refreshResponse.ok) {
            const err = new Error("Phiên đăng nhập đã hết hạn.");
            processQueue(err, null);
            window.dispatchEvent(new Event("auth-failure"));
            throw err;
          }

          processQueue(null, null);

          // Retry original request
          response = await fetch(fullUrl, fetchOptions);
        } catch (error) {
          const errorToProcess =
            error instanceof Error ? error : new Error(String(error));

          processQueue(errorToProcess, null);
          throw error;
        } finally {
          isRefreshing = false;
        }
      } else {
        // If refreshing, queue the request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => fetch(fullUrl, fetchOptions))
          .then(async (res) => {
            if (!res.ok) {
              throw new Error(
                `Yêu cầu thất bại sau khi refresh token (status ${res.status})`
              );
            }
            const contentType = res.headers.get("content-type");
            if (contentType && contentType.includes("application/json")) {
              return res.json();
            }
            return { success: true };
          });
      }
    }

    // If using Authorization header and got 401, treat as auth failure
    if (usingAuthHeader && response.status === 401) {
      window.dispatchEvent(new Event("auth-failure"));
      throw new Error("Unauthorized");
    }

    // Handle other errors
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const error = new Error(
        errorData.error ||
          errorData.message ||
          `Yêu cầu thất bại với mã ${response.status}`
      );
      error.response = { data: errorData, status: response.status };
      throw error;
    }

    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      return await response.json();
    }

    return { success: true };
  } catch (error) {
    console.error("Lỗi API:", error);

    if (needsAuth && (!error.response || error.response?.status === 401)) {
      window.dispatchEvent(new Event("auth-failure"));
    }

    throw error;
  }
};

// ---------------------------
//       PUBLIC API
// ---------------------------

// Không cần login
export const apiGet = (endpoint) =>
  apiRequest(endpoint, "GET", null, { needsAuth: false });

export const apiPost = (endpoint, data) =>
  apiRequest(endpoint, "POST", data, { needsAuth: false });

// Cần login → có refresh token
export const apiGetAuth = (endpoint, options) =>
  apiRequest(endpoint, "GET", null, { ...options, needsAuth: true });

export const apiPostAuth = (endpoint, data, options) =>
  apiRequest(endpoint, "POST", data, { ...options, needsAuth: true });

export const apiPutAuth = (endpoint, data, options) =>
  apiRequest(endpoint, "PUT", data, { ...options, needsAuth: true });

export const apiDeleteAuth = (endpoint, options) =>
  apiRequest(endpoint, "DELETE", null, { ...options, needsAuth: true });

export const apiDeleteAuthWithBody = (endpoint, data, options) =>
  apiRequest(endpoint, "DELETE", data, { ...options, needsAuth: true });

export const apiUploadAuth = (endpoint, formData, options) =>
  apiRequest(endpoint, "POST", formData, { ...options, needsAuth: true });

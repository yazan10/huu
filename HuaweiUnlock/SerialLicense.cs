using Newtonsoft.Json;
using System;
using System.Configuration;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
using static HuaweiUnlocker.LangProc;

namespace HuaweiUnlocker
{
    internal static class SerialLicense
    {
        private static readonly HttpClient Client = new HttpClient
        {
            Timeout = TimeSpan.FromSeconds(8)
        };

        private sealed class CheckResponse
        {
            public bool registered { get; set; }
        }

        public static bool IsRegistered(string serial)
        {
            if (string.IsNullOrWhiteSpace(serial) ||
                serial.Equals("NaN", StringComparison.OrdinalIgnoreCase) ||
                serial.Equals("NoData", StringComparison.OrdinalIgnoreCase))
            {
                LOG(2, "Device serial could not be read.");
                return false;
            }

            string checkUrl = ConfigurationManager.AppSettings["LicenseCheckUrl"];
            Uri endpoint;
            if (!Uri.TryCreate(checkUrl, UriKind.Absolute, out endpoint) ||
                endpoint.Scheme != Uri.UriSchemeHttps)
            {
                LOG(2, "Serial verification service is not configured.");
                return false;
            }

            try
            {
                using (var content = new StringContent(
                    JsonConvert.SerializeObject(new { serial = serial.Trim() }),
                    Encoding.UTF8,
                    "application/json"))
                using (HttpResponseMessage response = Client.PostAsync(endpoint, content).GetAwaiter().GetResult())
                {
                    response.EnsureSuccessStatusCode();
                    string body = response.Content.ReadAsStringAsync().GetAwaiter().GetResult();
                    CheckResponse result = JsonConvert.DeserializeObject<CheckResponse>(body);
                    if (result == null || !result.registered)
                    {
                        LOG(2, "This device serial is not registered.");
                        return false;
                    }

                    LOG(0, "Device serial verified.");
                    return true;
                }
            }
            catch (HttpRequestException)
            {
                LOG(2, "Serial verification service is unavailable.");
                return false;
            }
            catch (TaskCanceledException)
            {
                LOG(2, "Serial verification timed out.");
                return false;
            }
            catch (JsonException)
            {
                LOG(2, "Serial verification returned an invalid response.");
                return false;
            }
        }
    }
}

package metrics

import (
	"fmt"
	"net/http"
	"sync/atomic"
	"time"

	"github.com/gin-gonic/gin"
)

var (
	activeMatches   int64
	totalMatches    int64
	activeWS        int64
	totalWS         int64
	matchLatencySum int64
	matchLatencyN   int64
)

func IncActiveMatches()    { atomic.AddInt64(&activeMatches, 1) }
func DecActiveMatches()    { atomic.AddInt64(&activeMatches, -1) }
func IncTotalMatches()     { atomic.AddInt64(&totalMatches, 1) }
func IncActiveWS()         { atomic.AddInt64(&activeWS, 1) }
func DecActiveWS()         { atomic.AddInt64(&activeWS, -1) }
func IncTotalWS()          { atomic.AddInt64(&totalWS, 1) }

func RecordMatchLatency(d time.Duration) {
	atomic.AddInt64(&matchLatencySum, d.Milliseconds())
	atomic.AddInt64(&matchLatencyN, 1)
}

// PrometheusMiddleware returns a Gin middleware for request tracking
func PrometheusMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Next()
	}
}

// MetricsHandler is a gin-compatible handler
func MetricsHandler(c *gin.Context) {
	Handler()(c.Writer, c.Request)
}

// Handler returns Prometheus-compatible metrics
func Handler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/plain; version=0.0.4")

		fmt.Fprintf(w, "# HELP beast_arena_active_matches Current active matches\n")
		fmt.Fprintf(w, "beast_arena_active_matches %d\n", atomic.LoadInt64(&activeMatches))

		fmt.Fprintf(w, "# HELP beast_arena_total_matches Total matches played\n")
		fmt.Fprintf(w, "beast_arena_total_matches_total %d\n", atomic.LoadInt64(&totalMatches))

		fmt.Fprintf(w, "# HELP beast_arena_active_websockets Current WebSocket connections\n")
		fmt.Fprintf(w, "beast_arena_active_websockets %d\n", atomic.LoadInt64(&activeWS))

		fmt.Fprintf(w, "# HELP beast_arena_total_websockets Total WebSocket connections\n")
		fmt.Fprintf(w, "beast_arena_total_websockets_total %d\n", atomic.LoadInt64(&totalWS))

		n := atomic.LoadInt64(&matchLatencyN)
		if n > 0 {
			avg := atomic.LoadInt64(&matchLatencySum) / n
			fmt.Fprintf(w, "# HELP beast_arena_match_latency_avg_ms Average match latency\n")
			fmt.Fprintf(w, "beast_arena_match_latency_avg_ms %d\n", avg)
		}
	}
}

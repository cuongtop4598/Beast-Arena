package game

import (
	"math/rand"

	"github.com/google/uuid"
)

// SupplyDropType defines what a supply drop contains
type SupplyDropItem struct {
	ID    string  `json:"id"`
	Name  string  `json:"name"`
	Type  string  `json:"type"` // heal, damage_boost, speed_boost, shield, ult_charge
	Value float64 `json:"value"`
	Duration int  `json:"duration"` // frames (0 = instant)
}

var SupplyDropPool = []SupplyDropItem{
	{ID: "heal_small", Name: "Small Heal", Type: "heal", Value: 50, Duration: 0},
	{ID: "heal_large", Name: "Large Heal", Type: "heal", Value: 100, Duration: 0},
	{ID: "damage_boost", Name: "Damage Boost", Type: "damage_boost", Value: 1.3, Duration: 600}, // 10s at 60fps
	{ID: "speed_boost", Name: "Speed Boost", Type: "speed_boost", Value: 1.5, Duration: 480},     // 8s
	{ID: "shield", Name: "Shield", Type: "shield", Value: 50, Duration: 0},                       // absorbs 50 damage
	{ID: "ult_charge", Name: "Ultimate Charge", Type: "ult_charge", Value: 30, Duration: 0},       // +30% ult gauge
}

// SpawnSchedule determines when supply drops appear
type SpawnSchedule struct {
	minInterval int // minimum frames between spawns
	maxInterval int
	nextSpawn   int // frame number for next spawn
}

// NewSpawnSchedule creates a scheduler
func NewSpawnSchedule() *SpawnSchedule {
	return &SpawnSchedule{
		minInterval: 900,  // 15 seconds at 60fps
		maxInterval: 1800, // 30 seconds
		nextSpawn:   600,  // First drop at 10 seconds
	}
}

// CheckSpawn returns a new supply drop if it's time
func (s *SpawnSchedule) CheckSpawn(currentFrame int) *SupplyDrop {
	if currentFrame < s.nextSpawn {
		return nil
	}

	// Schedule next spawn
	s.nextSpawn = currentFrame + s.minInterval + rand.Intn(s.maxInterval-s.minInterval)

	// Random drop item
	item := SupplyDropPool[rand.Intn(len(SupplyDropPool))]

	// Random position (center area of stage)
	x := 300 + rand.Float64()*680 // between 300-980

	return &SupplyDrop{
		ID:       uuid.New().String(),
		Type:     item.Type,
		ItemID:   item.ID,
		Position: Vector2D{X: x, Y: 0},
		SpawnAt:  currentFrame,
		Warning:  currentFrame - 540, // 9 second warning
		Claimed:  false,
	}
}

// ClaimDrop applies the supply drop effect to a fighter
func ClaimDrop(drop *SupplyDrop, fighter *FighterState) {
	if drop.Claimed {
		return
	}
	drop.Claimed = true

	item := findItem(drop.ItemID)
	if item == nil {
		return
	}

	switch item.Type {
	case "heal":
		fighter.HP += int(item.Value)
		if fighter.HP > fighter.MaxHP {
			fighter.HP = fighter.MaxHP
		}
	case "ult_charge":
		fighter.UltGauge += item.Value
		if fighter.UltGauge > 100 {
			fighter.UltGauge = 100
		}
	case "damage_boost", "speed_boost":
		fighter.ActiveBuffs = append(fighter.ActiveBuffs, Buff{
			ID:       item.ID,
			Type:     item.Type,
			Value:    item.Value,
			Duration: item.Duration,
		})
	case "shield":
		fighter.ActiveBuffs = append(fighter.ActiveBuffs, Buff{
			ID:       "shield",
			Type:     "shield",
			Value:    item.Value,
			Duration: 99999, // until depleted
		})
	}
}

func findItem(id string) *SupplyDropItem {
	for _, item := range SupplyDropPool {
		if item.ID == id {
			return &item
		}
	}
	return nil
}

package game

import (
	"math"
	"math/rand"
)

// DamageResult holds the outcome of a damage calculation
type DamageResult struct {
	RawDamage    int     `json:"raw_damage"`
	FinalDamage  int     `json:"final_damage"`
	IsCritical   bool    `json:"is_critical"`
	IsBlocked    bool    `json:"is_blocked"`
	Knockback    float64 `json:"knockback"`
	HitStun      int     `json:"hit_stun"` // frames
	UltGainAtk   float64 `json:"ult_gain_atk"`
	UltGainDef   float64 `json:"ult_gain_def"`
}

// CalculateDamage computes damage from attacker to defender (server-authoritative)
func CalculateDamage(attacker, defender *FighterState, skill *SkillDef, attackerStats, defenderStats *CharacterStats) DamageResult {
	// Base damage = skill.Damage * (ATK / 20)
	atkMod := float64(attackerStats.ATK) / 20.0
	baseDamage := float64(skill.Damage) * atkMod

	// Defense reduction = DEF * 1.5
	defReduction := float64(defenderStats.DEF) * 1.5

	// Block check
	isBlocked := defender.State == ActionBlocking
	blockMod := 1.0
	if isBlocked {
		blockMod = 0.25 // blocked hits deal 25% damage
	}

	// Critical hit: 10% base + Special/100
	critChance := 0.10 + float64(attackerStats.Special)/100.0
	isCritical := rand.Float64() < critChance
	critMod := 1.0
	if isCritical {
		critMod = 1.5
	}

	// Random variance ±5%
	variance := 0.95 + rand.Float64()*0.10

	// Final damage
	rawDamage := baseDamage * critMod * variance
	finalDamage := math.Max(1, (rawDamage-defReduction)*blockMod)

	// Knockback
	knockback := 30.0
	if skill.Effect == "knockback" || skill.Effect == "knockdown" {
		knockback = 80.0
	}
	if isBlocked {
		knockback *= 0.3
	}

	// Hit stun (frames the defender can't act)
	hitStun := skill.Active + 2
	if isBlocked {
		hitStun = skill.Active / 2
	}
	if isCritical {
		hitStun += 3
	}

	// Ultimate gauge generation
	ultGainAtk := float64(finalDamage) * 0.08 // attacker gains 8% of damage dealt
	ultGainDef := float64(finalDamage) * 0.12  // defender gains 12% of damage taken (comeback mechanic)

	return DamageResult{
		RawDamage:   int(rawDamage),
		FinalDamage: int(finalDamage),
		IsCritical:  isCritical,
		IsBlocked:   isBlocked,
		Knockback:   knockback,
		HitStun:     hitStun,
		UltGainAtk:  ultGainAtk,
		UltGainDef:  ultGainDef,
	}
}

// ApplyDamage applies a DamageResult to the game state
func ApplyDamage(gs *GameState, targetIsP1 bool, result DamageResult) {
	var target *FighterState
	var attacker *FighterState
	if targetIsP1 {
		target = gs.Player1
		attacker = gs.Player2
	} else {
		target = gs.Player2
		attacker = gs.Player1
	}

	// Apply HP reduction
	target.HP -= result.FinalDamage
	if target.HP < 0 {
		target.HP = 0
	}

	// Apply knockback
	direction := 1.0
	if target.Facing == "right" {
		direction = -1.0
	}
	target.Position.X += result.Knockback * direction

	// Clamp to stage bounds
	if target.Position.X < 50 {
		target.Position.X = 50
	}
	if target.Position.X > 1230 {
		target.Position.X = 1230
	}

	// Apply hit stun
	if result.IsBlocked {
		target.State = ActionBlocking
	} else if result.FinalDamage > 0 {
		target.State = ActionStunned
	}

	// Ultimate gauge
	attacker.UltGauge += result.UltGainAtk
	target.UltGauge += result.UltGainDef
	if attacker.UltGauge > 100 {
		attacker.UltGauge = 100
	}
	if target.UltGauge > 100 {
		target.UltGauge = 100
	}

	// Combo tracking
	attacker.ComboCount++
}

// CheckKO returns true if a fighter has 0 HP
func CheckKO(gs *GameState) (bool, string) {
	if gs.Player1.HP <= 0 {
		return true, gs.Player2.PlayerID
	}
	if gs.Player2.HP <= 0 {
		return true, gs.Player1.PlayerID
	}
	return false, ""
}

// CheckTimeout determines winner when timer expires
func CheckTimeout(gs *GameState) string {
	if gs.Player1.HP > gs.Player2.HP {
		return gs.Player1.PlayerID
	}
	if gs.Player2.HP > gs.Player1.HP {
		return gs.Player2.PlayerID
	}
	return "" // draw — both survive
}

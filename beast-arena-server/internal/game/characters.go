package game

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sync"
)

// CharacterStats represents balanced stats (total = 100)
type CharacterStats struct {
	HP      int `json:"hp"`
	ATK     int `json:"atk"`
	SPD     int `json:"spd"`
	DEF     int `json:"def"`
	Special int `json:"special"`
}

// SkillDef defines a character skill
type SkillDef struct {
	ID           string `json:"id"`
	Name         string `json:"name"`
	Damage       int    `json:"damage"`
	Startup      int    `json:"startup"`       // frames
	Active       int    `json:"active"`        // frames
	Recovery     int    `json:"recovery"`      // frames
	Cooldown     int    `json:"cooldown"`      // milliseconds
	Type         string `json:"type"`          // strike, grab, projectile, buff
	Effect       string `json:"effect"`        // stun, knockdown, knockback, slow
	AnimationKey string `json:"animation_key"` // Spine animation name
}

// MovesetDef defines all skills for a character
type MovesetDef struct {
	NormalAttack  []SkillDef `json:"normal_attack"` // combo chain
	SpecialSkill1 SkillDef   `json:"special_skill_1"`
	SpecialSkill2 SkillDef   `json:"special_skill_2"`
	SpecialSkill3 SkillDef   `json:"special_skill_3"`
	SpecialSkill4 SkillDef   `json:"special_skill_4"`
	Ultimate      SkillDef   `json:"ultimate"`
}

// CharacterConfig defines a complete character (data-driven)
type CharacterConfig struct {
	ID        string         `json:"id"`
	Name      string         `json:"name"`
	Title     string         `json:"title"`
	MartialArt string        `json:"martial_art"`
	Stats     CharacterStats `json:"stats"`
	Moveset   MovesetDef     `json:"moveset"`
}

// CharacterRegistry holds all registered characters
type CharacterRegistry struct {
	characters map[string]*CharacterConfig
	mu         sync.RWMutex
}

// NewCharacterRegistry creates a new registry
func NewCharacterRegistry() *CharacterRegistry {
	return &CharacterRegistry{
		characters: make(map[string]*CharacterConfig),
	}
}

// Register adds a character to the registry
func (r *CharacterRegistry) Register(config *CharacterConfig) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.characters[config.ID] = config
}

// Get retrieves a character by ID
func (r *CharacterRegistry) Get(id string) (*CharacterConfig, bool) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	c, ok := r.characters[id]
	return c, ok
}

// GetAll returns all registered characters
func (r *CharacterRegistry) GetAll() []*CharacterConfig {
	r.mu.RLock()
	defer r.mu.RUnlock()
	result := make([]*CharacterConfig, 0, len(r.characters))
	for _, c := range r.characters {
		result = append(result, c)
	}
	return result
}

// LoadFromDir loads all character JSON configs from a directory
func (r *CharacterRegistry) LoadFromDir(dir string) error {
	files, err := os.ReadDir(dir)
	if err != nil {
		return fmt.Errorf("read character dir: %w", err)
	}

	for _, f := range files {
		if f.IsDir() || filepath.Ext(f.Name()) != ".json" {
			continue
		}
		data, err := os.ReadFile(filepath.Join(dir, f.Name()))
		if err != nil {
			return fmt.Errorf("read %s: %w", f.Name(), err)
		}
		var cfg CharacterConfig
		if err := json.Unmarshal(data, &cfg); err != nil {
			return fmt.Errorf("parse %s: %w", f.Name(), err)
		}
		r.Register(&cfg)
	}
	return nil
}

// DefaultRegistry is the global character registry
var DefaultRegistry = NewCharacterRegistry()

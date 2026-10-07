/*
 * [Input] Deterministic centered and directional joystick samples.
 * [Output] Assertions for center-aware four-way hysteresis, limited-travel
 *          direction recognition, dominant-axis resolution, and held repeat.
 * [Pos] Native C regression executable for P4 input logic.
 * [Sync] If this file changes, update `p4_input_logic_test.py` and the decoder.
 */

#include "pet_p4_input_core.h"

#include <assert.h>
#include <stddef.h>

static void release_to_center(pet_p4_joystick_decoder_t *decoder) {
  assert(pet_p4_joystick_decoder_update(decoder, 2048, 2048, 5) == PET_P4_JOYSTICK_CENTER);
}

// 检查指定方向始终抵达同一行或列，包括跨页位置。
static void assert_grid_moves(size_t selected, size_t count, pet_p4_joystick_direction_t direction, size_t expected) {
  size_t target = count;
  assert(pet_p4_component_grid_target(selected, count, direction, &target));
  assert(target == expected);
}

// 空位和边界不得悄悄跳到其他行列，也不得改写输出位置。
static void assert_grid_stays(size_t selected, size_t count, pet_p4_joystick_direction_t direction) {
  size_t target = count;
  assert(!pet_p4_component_grid_target(selected, count, direction, &target));
  assert(target == count);
}

// 覆盖实体方向解码及组件中心两列网格在满页、跨页和末页缺项时的移动。
int main(void) {
  int center_x;
  int center_y;
  const int samples = PET_P4_JOYSTICK_CALIBRATION_SAMPLES;
  assert(pet_p4_joystick_calibrate_center(2048 * samples, 2100 * samples, samples, &center_x, &center_y));
  assert(center_x == 2048 && center_y == 2100);
  assert(!pet_p4_joystick_calibrate_center(500 * samples, 520 * samples, samples, &center_x, &center_y));
  assert(center_x == 500 && center_y == 520);
  assert(!pet_p4_joystick_calibrate_center(2048 * samples, 500 * samples, samples, &center_x, &center_y));
  assert(!pet_p4_joystick_calibrate_center(4095 * samples, 2048 * samples, samples, &center_x, &center_y));
  assert(!pet_p4_joystick_calibrate_center(2048 * (samples - 1), 2048 * (samples - 1), samples - 1, &center_x, &center_y));
  assert(!pet_p4_joystick_calibrate_center(0, 0, 0, &center_x, &center_y));
  assert(center_x == 0 && center_y == 0);
  assert(!pet_p4_joystick_calibrate_center(0, 0, samples, NULL, &center_y));
  assert(pet_p4_joystick_calibrate_center(1200 * samples, 2900 * samples, samples, &center_x, &center_y));
  pet_p4_joystick_decoder_t joystick;
  pet_p4_joystick_decoder_init(&joystick, 2048, 2048, 900, 500, 350, 140);

  assert(pet_p4_joystick_decoder_update(&joystick, 2048, 2048, 5) == PET_P4_JOYSTICK_CENTER);
  assert(pet_p4_joystick_decoder_update(&joystick, 400, 2048, 5) == PET_P4_JOYSTICK_LEFT);
  assert(pet_p4_joystick_decoder_update(&joystick, 1600, 2048, 5) == PET_P4_JOYSTICK_CENTER);
  release_to_center(&joystick);
  assert(pet_p4_joystick_decoder_update(&joystick, 3700, 2048, 5) == PET_P4_JOYSTICK_RIGHT);
  release_to_center(&joystick);
  assert(pet_p4_joystick_decoder_update(&joystick, 2048, 3700, 5) == PET_P4_JOYSTICK_UP);
  release_to_center(&joystick);
  assert(pet_p4_joystick_decoder_update(&joystick, 2048, 400, 5) == PET_P4_JOYSTICK_DOWN);
  release_to_center(&joystick);

  // Limited-travel samples from production joystick batches must cross the
  // center-aware threshold even though they do not reach the ADC rails.
  assert(pet_p4_joystick_decoder_update(&joystick, 1500, 2048, 5) == PET_P4_JOYSTICK_LEFT);
  release_to_center(&joystick);
  assert(pet_p4_joystick_decoder_update(&joystick, 2600, 2048, 5) == PET_P4_JOYSTICK_RIGHT);
  release_to_center(&joystick);
  assert(pet_p4_joystick_decoder_update(&joystick, 2048, 2600, 5) == PET_P4_JOYSTICK_UP);
  release_to_center(&joystick);
  assert(pet_p4_joystick_decoder_update(&joystick, 2048, 1500, 5) == PET_P4_JOYSTICK_DOWN);
  release_to_center(&joystick);

  // A diagonal sample resolves to the dominant axis and emits only once.
  assert(pet_p4_joystick_decoder_update(&joystick, 3500, 3100, 5) == PET_P4_JOYSTICK_RIGHT);
  assert(pet_p4_joystick_decoder_update(&joystick, 3500, 3100, 340) == PET_P4_JOYSTICK_CENTER);
  assert(pet_p4_joystick_decoder_update(&joystick, 3500, 3100, 10) == PET_P4_JOYSTICK_RIGHT);
  assert(pet_p4_joystick_decoder_update(&joystick, 3500, 3100, 140) == PET_P4_JOYSTICK_RIGHT);
  release_to_center(&joystick);

  assert_grid_moves(0, 4, PET_P4_JOYSTICK_DOWN, 2);
  assert_grid_moves(0, 4, PET_P4_JOYSTICK_RIGHT, 1);
  assert_grid_moves(1, 4, PET_P4_JOYSTICK_DOWN, 3);
  assert_grid_moves(2, 4, PET_P4_JOYSTICK_UP, 0);
  assert_grid_moves(2, 4, PET_P4_JOYSTICK_RIGHT, 3);
  assert_grid_moves(3, 4, PET_P4_JOYSTICK_LEFT, 2);
  assert_grid_moves(3, 4, PET_P4_JOYSTICK_UP, 1);
  assert_grid_stays(0, 4, PET_P4_JOYSTICK_UP);
  assert_grid_stays(0, 4, PET_P4_JOYSTICK_LEFT);
  assert_grid_stays(3, 4, PET_P4_JOYSTICK_RIGHT);
  assert_grid_stays(3, 4, PET_P4_JOYSTICK_DOWN);

  assert_grid_moves(1, 7, PET_P4_JOYSTICK_RIGHT, 4);
  assert_grid_moves(3, 7, PET_P4_JOYSTICK_RIGHT, 6);
  assert_grid_moves(4, 7, PET_P4_JOYSTICK_LEFT, 1);
  assert_grid_moves(6, 7, PET_P4_JOYSTICK_LEFT, 3);
  assert_grid_moves(4, 7, PET_P4_JOYSTICK_DOWN, 6);
  assert_grid_moves(6, 7, PET_P4_JOYSTICK_UP, 4);
  assert_grid_moves(2, 5, PET_P4_JOYSTICK_DOWN, 4);
  assert_grid_moves(4, 5, PET_P4_JOYSTICK_UP, 2);
  assert_grid_stays(3, 5, PET_P4_JOYSTICK_DOWN);
  assert_grid_stays(4, 5, PET_P4_JOYSTICK_RIGHT);
  assert_grid_stays(0, 1, PET_P4_JOYSTICK_DOWN);
  assert_grid_stays(0, 0, PET_P4_JOYSTICK_RIGHT);
  assert_grid_stays(0, 7, PET_P4_JOYSTICK_CENTER);
  assert(!pet_p4_component_grid_target(0, 1, PET_P4_JOYSTICK_RIGHT, NULL));

  return 0;
}

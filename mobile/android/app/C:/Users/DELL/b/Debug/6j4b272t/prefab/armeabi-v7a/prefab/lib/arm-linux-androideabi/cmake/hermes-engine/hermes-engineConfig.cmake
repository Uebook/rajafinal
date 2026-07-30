if(NOT TARGET hermes-engine::hermesvm)
add_library(hermes-engine::hermesvm SHARED IMPORTED)
set_target_properties(hermes-engine::hermesvm PROPERTIES
    IMPORTED_LOCATION "/Users/vansh/.gradle/caches/9.3.1/transforms/b16a7e2c2d86db5d4425023797a396d6/transformed/hermes-android-250829098.0.14-debug/prefab/modules/hermesvm/libs/android.armeabi-v7a/libhermesvm.so"
    INTERFACE_INCLUDE_DIRECTORIES "/Users/vansh/.gradle/caches/9.3.1/transforms/b16a7e2c2d86db5d4425023797a396d6/transformed/hermes-android-250829098.0.14-debug/prefab/modules/hermesvm/include"
    INTERFACE_LINK_LIBRARIES ""
)
endif()


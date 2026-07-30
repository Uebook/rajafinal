if(NOT TARGET ReactAndroid::hermestooling)
add_library(ReactAndroid::hermestooling SHARED IMPORTED)
set_target_properties(ReactAndroid::hermestooling PROPERTIES
    IMPORTED_LOCATION "/Users/vansh/.gradle/caches/9.3.1/transforms/6a10fef6cd8472b44c3da6bb0d167d42/transformed/react-android-0.86.0-debug/prefab/modules/hermestooling/libs/android.arm64-v8a/libhermestooling.so"
    INTERFACE_INCLUDE_DIRECTORIES "/Users/vansh/.gradle/caches/9.3.1/transforms/6a10fef6cd8472b44c3da6bb0d167d42/transformed/react-android-0.86.0-debug/prefab/modules/hermestooling/include"
    INTERFACE_LINK_LIBRARIES ""
)
endif()

if(NOT TARGET ReactAndroid::jsi)
add_library(ReactAndroid::jsi SHARED IMPORTED)
set_target_properties(ReactAndroid::jsi PROPERTIES
    IMPORTED_LOCATION "/Users/vansh/.gradle/caches/9.3.1/transforms/6a10fef6cd8472b44c3da6bb0d167d42/transformed/react-android-0.86.0-debug/prefab/modules/jsi/libs/android.arm64-v8a/libjsi.so"
    INTERFACE_INCLUDE_DIRECTORIES "/Users/vansh/.gradle/caches/9.3.1/transforms/6a10fef6cd8472b44c3da6bb0d167d42/transformed/react-android-0.86.0-debug/prefab/modules/jsi/include"
    INTERFACE_LINK_LIBRARIES ""
)
endif()

if(NOT TARGET ReactAndroid::reactnative)
add_library(ReactAndroid::reactnative SHARED IMPORTED)
set_target_properties(ReactAndroid::reactnative PROPERTIES
    IMPORTED_LOCATION "/Users/vansh/.gradle/caches/9.3.1/transforms/6a10fef6cd8472b44c3da6bb0d167d42/transformed/react-android-0.86.0-debug/prefab/modules/reactnative/libs/android.arm64-v8a/libreactnative.so"
    INTERFACE_INCLUDE_DIRECTORIES "/Users/vansh/.gradle/caches/9.3.1/transforms/6a10fef6cd8472b44c3da6bb0d167d42/transformed/react-android-0.86.0-debug/prefab/modules/reactnative/include"
    INTERFACE_LINK_LIBRARIES ""
)
endif()


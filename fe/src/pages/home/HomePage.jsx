// import React from 'react'

// Import from layouts
import PageLayout from "src/layouts/page_layout/PageLayout"

// Import from components
import Button from "src/components/button/Button";
// import SwitchSlider from "src/components/switch_slider/SwitchSlider";
// import ChatSection from "src/components/chat_section/ChatSection";
import { openMyDialog } from "src/components/dialog/dialog_entries";

// Import from utils
// import { OtherUtils } from 'src/utils/other';

// Import from assets
// import homeJSON from 'src/assets/data/home.json';

export default function HomePage() {
  return (
    <PageLayout headerTitle={"Home"} >
      <div>
        <div className="w-full mx-auto">
        {/*
          <SwitchSlider
            right={(_, toSlide) => <ChatSection toSlide={toSlide} />}
            left={(_, toSlide) => (
              <div>
                <div>
                  {
                    OtherUtils.fromContentToJSXElement(homeJSON.texts)
                  }
                </div>

                <div>
                  <Button extendClassName="text-white mt-3 me-3" onClick={() => toSlide("right")}>Bắt đầu ngay</Button>
                  <Button
                    onClick={() => openMyDialog()}
                    extendClassName="mt-3"
                    color="gray"
                    colorIntensity={200}
                    hoverIntensity={300}
                    activeIntensity={400}
                    focusIntensity={300}
                  >Thông tin khác</Button>
                </div>
              </div>
            )}
          />
        */}

          <div className="relative mx-auto w-fit">
            <img
              src="https://get.wallhere.com/photo/class-desk-table-window-light-738086.jpg"
              className="w-full min-h-[685px] block object-cover"
            />
            <div className="absolute top-[40%] w-full">
              <div className="px-[9%]">
                <p
                  className="w-3/4 font-bold text-white text-4xl"
                  style={{ textShadow: "2px 2px 10px #111" }}
                >
                  Hệ Thống Tư Vấn Thông Tin Học Đường Tỉnh Đồng Nai
                </p>
                <Button extendClassName="font-bold mt-5 mr-5">TÌM HIỂU THÊM</Button>
                <Button
                  extendClassName="font-bold mt-5 text-white"
                  color="sky-600" hoverColor="sky-600" activeColor="sky-700"
                  onClick={() => openMyDialog()}
                >VỀ NHÓM TÁC GIẢ</Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  )
}

// For scanning
// text-xl
// text-4xl font-bold
// w-full max-w-xl pt-4 text-lg
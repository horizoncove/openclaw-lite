"""
Shakespeare - 剧本创作助手
"""

import json
from datetime import datetime
from pathlib import Path

class Shakespeare:
    """剧本创作AI助手"""
    
    def __init__(self):
        self.project_name = "迷雾追踪"
        self.script_dir = Path("/root/.openclaw/workspace/openclaw-lite/data/scripts")
        self.script_dir.mkdir(parents=True, exist_ok=True)
    
    def create_blueprint(self, episode, theme, characters, genre="悬疑"):
        """
        创建单集剧本大纲
        """
        blueprint = {
            "剧集": f"第{episode}集",
            "主题": theme,
            "类型": genre,
            "主要角色": characters,
            "结构": {
                "第一幕（铺垫）": {
                    "场景1": "开场悬念引入",
                    "场景2": "人物关系铺垫",
                    "场景3": "冲突触发事件"
                },
                "第二幕（发展）": {
                    "场景4": "调查深入",
                    "场景5": "阻碍出现",
                    "场景6": "线索交织",
                    "场景7": "危机升级"
                },
                "第三幕（高潮）": {
                    "场景8": "真相揭晓",
                    "场景9": "正面对决",
                    "场景10": "结局收束"
                }
            },
            "关键情节点": [
                "悬念引入点",
                "第一个反转",
                "情感高潮",
                "真相揭晓",
                "结局收束"
            ],
            "时长预估": "10-15分钟",
            "场景数": "8-12个",
            "创建时间": datetime.now().strftime('%Y-%m-%d %H:%M')
        }
        
        # 保存大纲
        blueprint_file = self.script_dir / f"episode_{episode:02d}_blueprint.json"
        with open(blueprint_file, 'w', encoding='utf-8') as f:
            json.dump(blueprint, f, ensure_ascii=False, indent=2)
        
        print(f"✅ 剧本大纲已创建: 第{episode}集")
        return blueprint
    
    def analyze_script(self, script_text):
        """
        分析剧本结构
        """
        analysis = {
            "字数统计": len(script_text),
            "场景数": script_text.count("场景"),
            "对白数": script_text.count("："),
            "建议": []
        }
        
        # 简单分析规则
        if analysis["场景数"] < 5:
            analysis["建议"].append("场景数较少，建议增加节奏变化")
        
        if analysis["对白数"] > 100:
            analysis["建议"].append("对白较多，注意控制节奏")
        
        return analysis
    
    def generate_scene(self, scene_number, location, time, characters, plot_point):
        """
        生成单个场景模板
        """
        scene = f"""
### 场景 {scene_number}
**地点**：{location}
**时间**：{time}
**人物**：{', '.join(characters)}

**【画面描述】**
（此处添加场景画面描述）

**【对白】**
"""
        for char in characters[:2]:  # 主要两个角色
            scene += f"""
**{char}**：
> （对白内容）
"""
        
        scene += f"""
**【剧情推进】**
{plot_point}

---
"""
        return scene
    
    def polish_dialogue(self, dialogue_text, style="悬疑"):
        """
        润色对白（集成DeepSeek/通义千问后启用）
        """
        # 简单润色规则
        polished = dialogue_text
        
        # 替换一些常见词汇
        replacements = {
            "你好": "您好",
            "不知道": "不清楚",
            "没有": "未发现"
        }
        
        for old, new in replacements.items():
            polished = polished.replace(old, new)
        
        return polished
    
    def check_consistency(self, character_name, dialogues):
        """
        检查角色对话一致性
        """
        # 检查用词习惯
        word_count = {}
        for dialogue in dialogues:
            words = dialogue.split()
            for word in words:
                word_count[word] = word_count.get(word, 0) + 1
        
        # 找出高频词（可能的口头禅）
        common_words = sorted(word_count.items(), key=lambda x: x[1], reverse=True)[:3]
        
        return {
            "角色": character_name,
            "总对白数": len(dialogues),
            "高频词": common_words,
            "建议": "保持用词习惯一致"
        }
    
    def export_to_fountain(self, script_data, filename=None):
        """
        导出为Fountain格式（行业标准剧本格式）
        """
        if filename is None:
            filename = f"script_{datetime.now().strftime('%Y%m%d')}.fountain"
        
        fountain_content = f"""Title: {self.project_name}
Credit: Written by
Author: AI Assistant
Draft date: {datetime.now().strftime('%Y-%m-%d')}

"""
        
        # 实际使用根据script_data生成完整Fountain格式
        
        output_file = self.script_dir / filename
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(fountain_content)
        
        print(f"✅ Fountain格式剧本已导出: {output_file}")
        return output_file

# 便捷函数
def quick_blueprint(episode, theme, characters):
    """快速创建大纲"""
    shakespeare = Shakespeare()
    return shakespeare.create_blueprint(episode, theme, characters)

if __name__ == "__main__":
    # 测试
    shakespeare = Shakespeare()
    
    blueprint = shakespeare.create_blueprint(
        episode=6,
        theme="真相大白，凶手揭晓，CP终成眷属",
        characters=["李诺", "林默", "苏晚"]
    )
    
    print(json.dumps(blueprint, ensure_ascii=False, indent=2))